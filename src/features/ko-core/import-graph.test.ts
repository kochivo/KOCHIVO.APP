import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

type ReadSource = (path: string) => string | undefined;
const readSource: ReadSource = path => existsSync(path) ? readFileSync(path, 'utf8') : undefined;

// Follow the imported bindings, including renamed re-exports, rather than unrelated barrel exports.
function clientPaths(entry: string, seen = new Set<string>(), names?: string[], read: ReadSource = readSource): string[] {
  const key = `${entry}:${names?.join(',') ?? '*'}`;
  if (seen.has(key)) return [];
  seen.add(key);
  const text = read(entry);
  if (text === undefined) throw new Error(`Cannot read ${entry}`);
  const source = ts.createSourceFile(entry, text, ts.ScriptTarget.Latest, true);
  if (source.statements.some(statement => ts.isExpressionStatement(statement)
    && ts.isStringLiteral(statement.expression) && statement.expression.text === 'use client')) return [relative('.', entry)];
  const targets: string[] = [];
  function visit(node: ts.Node) {
    let specifier: string | undefined;
    let exports: string[] | undefined;
    if ((ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly)
      || (ts.isExportDeclaration(node) && !node.isTypeOnly)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text;
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        const bindings = clause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          exports = bindings.elements.filter(item => !item.isTypeOnly).map(item => (item.propertyName ?? item.name).text);
          if (clause?.name) exports.push('default');
          if (!exports.length) specifier = undefined;
        } else if (clause?.name && !bindings) exports = ['default'];
      } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        exports = node.exportClause.elements.filter(item => !item.isTypeOnly && (!names || names.includes(item.name.text)))
          .map(item => (item.propertyName ?? item.name).text);
        if (!exports.length) specifier = undefined;
      } else exports = names;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text;
    if (specifier?.startsWith('.') || specifier?.startsWith('@/')) {
      const base = specifier.startsWith('@/') ? resolve('src', specifier.slice(2)) : resolve(dirname(entry), specifier);
      const target = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]
        .find(path => read(path) !== undefined);
      if (!target) throw new Error(`Cannot resolve ${specifier} from ${entry}`);
      targets.push(...clientPaths(target, seen, exports, read));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return targets;
}

it('keeps KO API route import graphs free of client modules', () => {
  const routes = files('src/app').filter(path => /[\\/]api[\\/]ko[\\/].*route\.ts$/.test(path));
  expect(routes.length).toBeGreaterThan(0);
  for (const route of routes) expect(clientPaths(resolve(route)), route).toEqual([]);
});

it.each([
  "import { renamed } from './barrel';",
  "import * as all from './barrel';",
  "export * from './barrel';",
  "void import('./client');",
  "import './client';",
])('detects client modules through %s', source => {
  const fixture = new Map([
    [resolve('fixture/route.ts'), source],
    [resolve('fixture/barrel.ts'), "export { value as renamed } from './client'; export * from './cycle';"],
    [resolve('fixture/cycle.ts'), "export * from './barrel';"],
    [resolve('fixture/client.ts'), "'use client'; export const value = 1;"],
  ]);
  expect(clientPaths(resolve('fixture/route.ts'), new Set(), undefined, path => fixture.get(path)))
    .toContain(relative('.', resolve('fixture/client.ts')));
});

it('ignores erased type imports and unselected re-exports', () => {
  const fixture = new Map([
    [resolve('fixture/route.ts'), "import type { Client } from './client'; import { type Other } from './client'; import { safe } from './barrel';"],
    [resolve('fixture/barrel.ts'), "export { safe } from './safe'; export { Client } from './client';"],
    [resolve('fixture/safe.ts'), 'export const safe = 1;'],
    [resolve('fixture/client.ts'), "'use client';"],
  ]);
  expect(clientPaths(resolve('fixture/route.ts'), new Set(), undefined, path => fixture.get(path))).toEqual([]);
});

it('keeps ko-core production modules shared and framework-free', () => {
  for (const path of files('src/features/ko-core').filter(path => !path.endsWith('.test.ts'))) {
    expect(path).toMatch(/\.ts$/);
    expect(readFileSync(path, 'utf8'), path).not.toMatch(/['"](?:use client|server-only|react|next(?:\/[^'"]*)?)['"]|@\/ui\//);
  }
});

it('keeps KO features from importing another KO UI barrel', () => {
  const modules = files('src/features').filter(path => /[\\/]ko-[^\\/]+[\\/]/.test(path) && !path.endsWith('.test.ts'));
  for (const path of modules) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) && /^@\/features\/ko-[^/]+$/.test(node.text)) {
        const barrel = resolve('src', node.text.slice(2), 'index.ts');
        const file = ts.createSourceFile(barrel, readFileSync(barrel, 'utf8'), ts.ScriptTarget.Latest, true);
        const components = file.statements.flatMap(statement => ts.isExportDeclaration(statement)
          && !statement.isTypeOnly && statement.exportClause && ts.isNamedExports(statement.exportClause)
          ? statement.exportClause.elements.filter(item => !item.isTypeOnly && /^Ko[A-Z]/.test(item.name.text))
            .map(item => item.name.text) : []);
        for (const name of components) expect(clientPaths(barrel, new Set(), [name]), `${path}: ${node.text}`).toEqual([]);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

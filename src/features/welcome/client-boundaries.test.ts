import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const features = resolve('src/features');

function staticClientGraph(entry: string): string[] {
  const visited = new Set<string>();
  function visit(file: string) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    if (source.statements.some(statement => ts.isExpressionStatement(statement)
      && ts.isStringLiteral(statement.expression) && statement.expression.text === 'use server')) return;
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      if (ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly) continue;
      if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
      if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      expect(specifier, file).not.toMatch(/^@\/features\//);
      const base = specifier.startsWith('.') ? resolve(dirname(file), specifier) : '';
      if (!base.startsWith(features)) continue;
      const target = [base + '.ts', base + '.tsx', resolve(base, 'index.ts')].find(existsSync);
      if (target) visit(target);
    }
  }
  visit(resolve('src/features', entry));
  return [...visited].map(file => file.replaceAll('\\', '/'));
}

it('keeps login and welcome client graphs independent without feature barrels', () => {
  for (const entry of ['auth/components/login-methods.tsx', 'auth/components/captain-auth-card.tsx']) {
    expect(staticClientGraph(entry).filter(file => file.includes('/welcome/'))).toEqual([]);
  }
  expect(staticClientGraph('welcome/components/welcome-flow.tsx').filter(file => file.includes('/auth/'))).toEqual([]);
});

it('keeps welcome UI and copy out of the installed-login island', () => {
  const graph = staticClientGraph('welcome/components/installed-login-redirect-entry.tsx');
  expect(graph.some(file => file.endsWith('/welcome-navigation.ts'))).toBe(true);
  expect(graph.filter(file => /\/messages\.ts$|\/welcome-flow(?:-entry)?\.tsx$/.test(file))).toEqual([]);
});

it('loads welcome screens through a lazy client entry', () => {
  const graph = staticClientGraph('welcome/components/welcome-flow-entry.tsx');
  expect(graph.filter(file => /\/welcome-flow\.tsx$|\/messages\.ts$/.test(file))).toEqual([]);
});

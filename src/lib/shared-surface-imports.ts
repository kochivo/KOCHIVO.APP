import { posix } from 'node:path';
import ts from 'typescript';

type ReadSource = (path: string) => string | undefined;

// Parse source instead of importing modules: this guard must also run before a build.
export function checkSurfaceImports(surface: string, source: string, read: ReadSource): string[] {
  const cache = new Map<string, ts.SourceFile>();
  function parse(path: string, text: string) {
    const cached = cache.get(path);
    if (cached) return cached;
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    cache.set(path, file);
    return file;
  }
  function modulePath(from: string, specifier: string) {
    const base = specifier.startsWith('@/') ? `src/${specifier.slice(2)}`
      : posix.normalize(posix.join(posix.dirname(from), specifier));
    return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
      .find(path => read(path) !== undefined);
  }
  function exportedNames(path: string, seen = new Set<string>()): string[] {
    if (seen.has(path)) return [];
    seen.add(path);
    const text = read(path);
    if (text === undefined) return [];
    return parse(path, text).statements.flatMap(statement => {
      if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          return statement.exportClause.elements.filter(item => !item.isTypeOnly).map(item => item.name.text);
        }
        if (!statement.exportClause && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
          const next = modulePath(path, statement.moduleSpecifier.text);
          return next ? exportedNames(next, seen).filter(name => name !== 'default') : [];
        }
      }
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      if (!modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) return [];
      if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) return ['default'];
      if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations.flatMap(item => ts.isIdentifier(item.name) ? [item.name.text] : []);
      }
      if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) return [statement.name.text];
      return [];
    });
  }
  function resolveExport(path: string, name: string, seen = new Set<string>()): string | undefined {
    const key = `${path}:${name}`;
    if (seen.has(key)) return undefined;
    const nextSeen = new Set(seen).add(key);
    const text = read(path);
    if (text === undefined) return undefined;
    const file = parse(path, text);
    for (const statement of file.statements) {
      if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
        const specifier = statement.moduleSpecifier;
        const target = specifier && ts.isStringLiteral(specifier) ? modulePath(path, specifier.text) : undefined;
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          const item = statement.exportClause.elements.find(item => !item.isTypeOnly && item.name.text === name);
          if (item) {
            const original = (item.propertyName ?? item.name).text;
            return target ? resolveExport(target, original, nextSeen) : resolveLocal(path, file, original, nextSeen);
          }
        } else if (!statement.exportClause && target && name !== 'default') {
          const found = resolveExport(target, name, nextSeen);
          if (found) return found;
        }
      }
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      if (modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        if (name === 'default' && modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) return path;
        if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => ts.isIdentifier(item.name) && item.name.text === name)) return path;
        if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === name) return path;
      }
      if (name === 'default' && ts.isExportAssignment(statement)) {
        return ts.isIdentifier(statement.expression) ? resolveLocal(path, file, statement.expression.text, nextSeen) : path;
      }
    }
    return undefined;
  }
  function resolveLocal(path: string, file: ts.SourceFile, name: string, seen: Set<string>): string | undefined {
    for (const statement of file.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        const bindings = clause?.namedBindings;
        const item = bindings && ts.isNamedImports(bindings) ? bindings.elements.find(item => item.name.text === name) : undefined;
        const imported = item ? (item.propertyName ?? item.name).text : clause?.name?.text === name ? 'default' : undefined;
        if (imported) {
          const target = modulePath(path, statement.moduleSpecifier.text);
          return target ? resolveExport(target, imported, seen) : undefined;
        }
      }
      if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === name) return path;
      if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => ts.isIdentifier(item.name) && item.name.text === name)) return path;
    }
    return undefined;
  }
  const failures: string[] = [];
  for (const statement of parse(surface, source).statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!/^@\/features\/[^/]+$/.test(statement.moduleSpecifier.text)) continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;
    const barrel = `src/${statement.moduleSpecifier.text.slice(2)}/index.ts`;
    const bindings = clause.namedBindings;
    const names = [
      ...(clause.name ? ['default'] : []),
      ...(bindings && ts.isNamedImports(bindings) ? bindings.elements.filter(item => !item.isTypeOnly).map(item => (item.propertyName ?? item.name).text) : []),
      ...(bindings && ts.isNamespaceImport(bindings) ? exportedNames(barrel) : []),
    ];
    for (const name of names) {
      const target = resolveExport(barrel, name);
      if (target && /-(?:entry|loader)\.tsx$/.test(target)) continue;
      const text = target ? read(target) : undefined;
      const first = target && text !== undefined ? parse(target, text).statements[0] : undefined;
      const client = first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use client';
      if (!target || client) failures.push(`${surface}: ${name} from ${statement.moduleSpecifier.text} ${target ? `resolves to static client module ${target}` : 'could not be resolved'}. Export a -entry.tsx / -loader.tsx wrapper from the barrel, or load it with next/dynamic / React.lazy in the surface.`);
    }
  }
  return failures;
}

export function checkServerEntry(entry: string, source: string, read: ReadSource): string[] {
  const parse = (path: string, text: string) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const marked = (file: ts.SourceFile) => file.statements.some(statement => ts.isImportDeclaration(statement)
    && !statement.importClause && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === 'server-only');
  const directive = (file: ts.SourceFile) => file.statements.some(statement => ts.isExpressionStatement(statement)
    && ts.isStringLiteral(statement.expression) && ['use client', 'use server'].includes(statement.expression.text));
  const file = parse(entry, source);
  const failures: string[] = [];
  if (!marked(file) || directive(file)) failures.push(`${entry}: server.ts must import 'server-only' and must not be a client or server action module.`);
  let exports = 0;
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && !statement.importClause && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text === 'server-only') continue;
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
      failures.push(`${entry}: server.ts must only re-export server-only modules.`);
      continue;
    }
    exports++;
    const specifier = statement.moduleSpecifier.text;
    const base = specifier.startsWith('@/') ? `src/${specifier.slice(2)}`
      : posix.normalize(posix.join(posix.dirname(entry), specifier));
    const path = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(path => read(path) !== undefined);
    const text = path ? read(path) : undefined;
    const target = path && text !== undefined ? parse(path, text) : undefined;
    if (!target || !marked(target) || directive(target))
      failures.push(`${entry}: ${specifier} must import 'server-only' and must not be a client or server action module.`);
  }
  if (!exports) failures.push(`${entry}: server.ts must re-export a server-only module.`);
  return failures;
}

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import ts from 'typescript';

// T-184 intentionally detects Cairo to select Egyptian rather than standard Arabic.
const cairoLiteralAllowlist = new Set(['src/core/i18n/locale.ts']);

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? sources(join(dir, entry.name)) : /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')
      ? [join(dir, entry.name)] : []);
}
it('keeps Cairo in DEFAULT_TIMEZONE and passes a zone to every calendar-day calculation', () => {
  const failures: string[] = [];
  for (const file of sources('src')) {
    const text = readFileSync(file, 'utf8');
    const remaining = text.replace("export const DEFAULT_TIMEZONE = 'Africa/Cairo';", '');
    if (remaining.includes('Africa/Cairo') && !cairoLiteralAllowlist.has(file.replaceAll('\\', '/'))) failures.push(file);
    // A call whose source text is localDate cannot occur without this literal.
    // Keep the Cairo check above on every file, avoiding unrelated AST allocations.
    if (!text.includes('localDate')) continue;
    const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && node.expression.getText(tree) === 'localDate' && node.arguments.length < 2) failures.push(file);
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  expect(failures).toEqual([]);
});

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

it('gives every native sheet an opaque surface', () => {
  const root = path.resolve('src');
  const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter(file => file.endsWith('.tsx'));
  for (const file of files) {
    // The tour dialog is a spotlight canvas; its floating card is the sheet.
    if (file === path.join('ui', 'tour.tsx')) continue;
    const source = readFileSync(path.join(root, file), 'utf8');
    const tag = source.search(/<(?:dialog|ResponsiveDialog)\b/);
    if (tag === -1) continue;
    const surface = source.slice(tag).match(/className=(?:"([^"]+)"|\{cn\('([^']+)')/);
    expect(surface?.[1] ?? surface?.[2], file).toMatch(/\bsheet\b/);
    expect(surface?.[1] ?? surface?.[2], file).not.toContain('glass-strong');
  }
  const tour = readFileSync(path.join(root, 'ui/tour.tsx'), 'utf8');
  expect(tour).toMatch(/className="enter sheet fixed/);
  const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8');
  expect(css).toMatch(/@utility sheet \{[^}]*background: var\(--color-surface\);[^}]*backdrop-filter: none;/);
});

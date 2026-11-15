import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { MealTargets } from './components/editor/meal-targets';

it.each(['ar', 'en'] as const)('renders one editable tile per macro in %s', locale => {
  const macros = { kcal: 2000, protein: 150, carbs: 225, fat: 56 };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(MealTargets, {
    targets: macros, totals: macros, onChange() {},
  })));
  const tiles = html.match(/<label\b[\s\S]*?<\/label>/g) ?? [];
  expect(tiles).toHaveLength(4);
  for (const tile of tiles) {
    expect(tile).toContain('recessed');
    expect(tile).toContain('lucide-pencil');
    const input = tile.match(/<input[^>]+>/)?.[0] ?? '';
    expect(input).toContain('bg-transparent');
    expect(input).not.toMatch(/(?:border-line|bg-surface|rounded-control)/);
    expect(input).toContain('focus-visible:ring-lime');
    expect(input).toContain('min-h-12');
  }
});
it('keeps the first-meal prompt plain above the existing add action', () => {
  const source = readFileSync(new URL('./components/v11-editor.tsx', import.meta.url), 'utf8');
  expect(source).toContain('<p className="text-muted">{pt(\'addYourFirstMealToStart\')}</p>');
});
it('keeps the player plan first-meal prompt plain too', () => {
  const source = readFileSync(new URL('./components/editor/player-editor.tsx', import.meta.url), 'utf8');
  expect(source).toContain('<p className="mb-stack text-muted">{t(\'empty\')}</p>');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { MedalArt } from './medal-art';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const tokens = Object.fromEntries([...readFileSync('src/app/globals.css', 'utf8')
  .matchAll(/--color-medal-([\w-]+): (#[\da-f]+);/g)].map(match => [match[1], match[2]]));

const render = (rank: 0 | 1 | 2 | 3 | 4 | 5 | 6, props = {}) =>
  renderToStaticMarkup(createElement(MedalArt, { rank, id: 'test', label: 'Rank', ...props }));

it('retains every dynamic medal paint in the generated stylesheet', async () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  // The junction contains two PostCSS type trees with the same runtime plugin API.
  const plugin = tailwind() as unknown as postcss.AcceptedPlugin;
  const result = await postcss([plugin]).process(css, { from: 'src/app/globals.css' });
  for (const [name, value] of Object.entries(tokens)) {
    expect(result.css.includes(`--color-medal-${name}: ${value}`), name).toBe(true);
  }
});

it.each([
  [0, []], [1, []], [2, []], [3, ['rays', 'laurel']],
  [4, ['rays', 'laurel', 'wings', 'sparkles']],
  [5, ['rays', 'laurel', 'wings', 'sparkles', 'aura', 'tiara']],
  [6, ['rays', 'laurel', 'wings', 'sparkles', 'aura', 'crown']],
] as const)('draws the v7 silhouette for rank %i', (rank, parts) => {
  const html = render(rank);
  expect(html).toContain('viewBox="-10 -6 140 136"');
  expect(html).toContain('role="img" aria-label="Rank"');
  expect(html).toContain(`data-medal-rank="${rank}"`);
  for (const part of ['rays', 'laurel', 'wings', 'sparkles', 'aura', 'tiara', 'crown']) {
    expect(html.includes(`data-part="${part}"`)).toBe(parts.some(value => value === part));
  }
  expect(html).not.toContain('>KO<');
});

it.each([0, 1, 2, 3, 4, 5, 6] as const)('uses a dark locked palette and padlock for rank %i', rank => {
  const html = render(rank, { locked: true, shine: true });
  expect(html).toContain('data-part="lock"');
  expect(html).toContain('var(--color-medal-locked-s0)');
  for (const part of ['aura', 'sparkles', 'shine']) expect(html).not.toContain(`data-part="${part}"`);
  expect(html).not.toMatch(/grayscale|opacity-40/);
});

it.each(['star', 'flame', 'bolt', 'crown', 'calendar'])('replaces the default motif with %s', emblem => {
  const html = render(6, { emblem });
  expect(html).toContain(`data-emblem="${emblem}"`);
  expect(html).not.toContain('data-part="rank-motif"');
});

it('enables a reduced-motion-aware clipped shine only on request', () => {
  expect(render(3)).not.toContain('data-part="shine"');
  const html = render(3, { shine: true });
  expect(html).toContain('data-part="shine"');
  expect(html).toContain('clip-path="url(#testclip)"');
  expect(html).toContain('prefers-reduced-motion');
});

it.each([0, 1, 2, 3, 4, 5, 6] as const)('renders rank %i with explicit OG paints and no CSS or animation', rank => {
  const paints = Object.fromEntries(Object.entries(tokens).map(([key, value]) => [key.replace(`${rank}-`, ''), value]));
  const html = render(rank, { paints, shine: true });
  expect(html).not.toContain('var(');
  expect(html).not.toContain('<style');
  expect(html).not.toContain('data-part="shine"');
  expect(html).toContain(`stop-color="${tokens[`${rank}-s0`]}"`);
});

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Stepper } from './stepper';
import { TextField } from './text-field';
import { GlassCard } from './glass-card';
import { Chip } from './chip';
import { Orbs } from './orbs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const dark = css.split("html[data-theme='light'] {")[0] ?? '';
const rgb = (name: string) => {
  const hex = dark.match(new RegExp(`--${name}: #([0-9a-f]{6})`))?.[1];
  if (!hex) throw new Error(`Missing ${name}`);
  return [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
};
const luminance = (channels: number[]) => channels.reduce((sum, value, index) => {
  const c = value / 255;
  return sum + (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    * ([.2126, .7152, .0722][index] ?? 0);
}, 0);

it('keeps dark background and mesh graphite without a green tint or pure black', () => {
  for (const name of ['color-bg', 'color-bg-deep', 'mesh-top', 'mesh-bottom']) {
    const channels = rgb(name);
    expect(Math.max(...channels) - Math.min(...channels), name).toBeLessThanOrEqual(2);
    expect(Math.min(...channels), name).toBeGreaterThanOrEqual(7);
    expect(Math.max(...channels), name).toBeLessThanOrEqual(13);
    expect(channels[1], name).toBeLessThanOrEqual(Math.max(channels[0] ?? 0, channels[2] ?? 0));
  }
  expect(dark).toContain('--page-glow: transparent');
  expect(dark).toContain('--mesh-glow: transparent');
});

it('keeps ink soft and muted text at AA contrast on graphite', () => {
  expect(Math.max(...rgb('color-ink'))).toBeLessThan(255);
  expect(Math.min(...rgb('color-ink'))).toBeGreaterThanOrEqual(230);
  expect((luminance(rgb('color-muted')) + .05) / (luminance(rgb('color-bg')) + .05)).toBeGreaterThanOrEqual(4.5);
});

it('uses subtle fill steps and hairlines without bright top highlights', () => {
  const alpha = (name: string) => Number(dark.match(new RegExp(`--${name}: rgb\\(255 255 255 / ([\\d.]+)\\)`))?.[1]);
  expect(['glass-tint', 'glass-tint-raised', 'glass-strong-tint'].map(alpha)).toEqual([.03, .05, .07]);
  expect(alpha('glass-hairline')).toBeCloseTo(.09);
  expect(alpha('glass-strong-border')).toBeCloseTo(.09);
  expect(alpha('glass-highlight')).toBeLessThanOrEqual(.04);
  expect(alpha('glass-strong-highlight')).toBeLessThanOrEqual(.04);
});

it('recesses text, number and time fields and both stepper sizes', () => {
  for (const type of ['text', 'number', 'time']) {
    const html = renderToStaticMarkup(createElement(TextField, { label: 'Value', type }));
    expect(html).toMatch(/<input[^>]*class="[^"]*\brecessed\b/);
    expect(html).toContain('placeholder:text-faint');
  }
  for (const size of ['gym', 'compact'] as const) {
    const html = renderToStaticMarkup(createElement(Stepper, { label: 'Reps', size, value: 8, step: 1, onChange: () => {} }));
    expect(html).toMatch(/<output[^>]*class="[^"]*\brecessed\b/);
    expect(html).toContain('tabular-nums');
  }
});

it('uses the shared card spacing and full chip radius', () => {
  expect(renderToStaticMarkup(createElement(GlassCard))).toContain('p-card md:p-6');
  expect(renderToStaticMarkup(createElement(Chip, { pressed: false }))).toContain('rounded-chip');
});

it('offers featured glass without making ordinary cards featured', () => {
  expect(renderToStaticMarkup(createElement(GlassCard, { level: 'featured' }))).toContain('glass-featured');
  expect(renderToStaticMarkup(createElement(GlassCard))).not.toContain('glass-featured');
});

it('hides root atmosphere and its shared progress gradient from assistive technology', () => {
  const html = renderToStaticMarkup(createElement(Orbs));
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('theme-dark-only bg-aurora');
  expect(html.match(/id="kochivo-progress-lime"/g)).toHaveLength(1);
});

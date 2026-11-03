import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const mix = (front: number[], back: number[], alpha: number) =>
  front.map((value, index) => value * alpha + (back[index] ?? 0) * (1 - alpha));
const luminance = (rgb: number[]) => rgb.reduce((sum, value, index) => {
  const channel = value / 255;
  return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    * ([0.2126, 0.7152, 0.0722][index] ?? 0);
}, 0);

it.each(['dark', 'light'])('keeps %s text readable on mesh, glass and solid surfaces', theme => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const token = (name: string) => {
    const source = theme === 'light' ? css.split("html[data-theme='light'] {")[1]?.split('}')[0] ?? '' : css;
    const hex = source.match(new RegExp(`--color-${name}: #([0-9a-f]{6})`))?.[1];
    if (!hex) throw new Error(`Missing ${name} color`);
    return [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
  };
  // Upper bound: the full lime glow over the brightest navy mesh, even where gradients don't overlap.
  const light = theme === 'light';
  const mesh = mix(token('lime'), light ? [231, 236, 226] : [23, 34, 46], 0.08);
  const glass = mix([255, 255, 255], mesh, light ? 0.7 : 0.05);
  const backgrounds = [mesh, glass, mix([255, 255, 255], glass, light ? 0.85 : 0.08),
    mix(light ? [255, 255, 255] : [0, 0, 0], mesh, light ? 0.95 : 0.4),
    token('bg'), token('bg-deep'), token('surface'), token('surface-raised')];
  const contrast = (a: number[], b: number[]) =>
    (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  for (const background of backgrounds) {
    for (const name of ['muted', 'ink', 'lime-ink', 'warn', 'danger']) {
      expect(contrast(token(name), background), `${theme} ${name}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token('lime-ink'), background)).toBeGreaterThanOrEqual(3);
  }
  expect(contrast(token('on-lime'), token('lime'))).toBeGreaterThanOrEqual(4.5);
});

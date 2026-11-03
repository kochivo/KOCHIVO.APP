import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const mix = (front: number[], back: number[], alpha: number) =>
  front.map((value, index) => value * alpha + (back[index] ?? 0) * (1 - alpha));
const luminance = (rgb: number[]) => rgb.reduce((sum, value, index) => {
  const channel = value / 255;
  return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    * ([0.2126, 0.7152, 0.0722][index] ?? 0);
}, 0);

it('keeps muted body text above 4.5:1 on glass and strong surfaces', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const token = (name: string) => {
    const hex = css.match(new RegExp(`--color-${name}: #([0-9a-f]{6})`))?.[1];
    if (!hex) throw new Error(`Missing ${name} color`);
    return [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
  };
  // Upper bound: the full lime glow over the brightest navy mesh, even where gradients don't overlap.
  const mesh = mix(token('lime'), [23, 34, 46], 0.08);
  const glass = mix([255, 255, 255], mesh, 0.05);
  const backgrounds = [glass, mix([255, 255, 255], glass, 0.05), mix([0, 0, 0], mesh, 0.4), token('surface')];
  for (const background of backgrounds) {
    expect((luminance(token('muted')) + 0.05) / (luminance(background) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});

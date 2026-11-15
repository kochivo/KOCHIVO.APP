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
  // Upper bound: the full page glow with the translucent surfaces composited over it.
  const light = theme === 'light';
  // Aurora and corner regions do not overlap: use the brighter aurora's full opacity.
  const mesh = mix(token('lime'), token('bg'), light ? 0.06 : .11);
  const glass = mix([255, 255, 255], mesh, light ? 0.6 : 0.03);
  const backgrounds = [mesh, glass, mix([255, 255, 255], glass, light ? 0.85 : 0.05),
    mix([255, 255, 255], mesh, light ? 0.95 : 0.07),
    token('bg'), token('bg-deep'), token('surface'), token('surface-raised')];
  if (!light) backgrounds.push(mix(token('lime'), mix([255, 255, 255], mesh, .07), .08));
  const contrast = (a: number[], b: number[]) =>
    (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  for (const background of backgrounds) {
    for (const name of ['muted', 'ink', 'lime-ink', 'warn', 'danger']) {
      expect(contrast(token(name), background), `${theme} ${name}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token('lime-ink'), background)).toBeGreaterThanOrEqual(3);
  }
  expect(contrast(token('on-lime'), token('lime'))).toBeGreaterThanOrEqual(4.5);
  const base = (name: string) => {
    const hex = css.match(new RegExp(`--color-${name}: #([0-9a-f]{6})`))?.[1];
    if (!hex) throw new Error(`Missing ${name}`);
    return [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
  };
  for (const name of ['lime-top', 'lime-bottom']) expect(contrast(token('on-lime'), base(name))).toBeGreaterThanOrEqual(4.5);
  for (const surface of ['bg', 'surface', 'surface-raised']) {
    for (const alpha of [.04, .09, .1]) {
      const secondary = mix(light ? token('ink') : [255, 255, 255], token(surface), alpha);
      expect(contrast(token('ink'), secondary), `${theme} secondary ${surface} ${alpha}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

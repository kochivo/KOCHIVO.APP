import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const surfaces = readFileSync(new URL('./surfaces.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');
const captain = surfaces.split('/* Captain workspace:')[1] ?? '';

describe('captain surface budget', () => {
  it('activates only for a dark captain workspace, including the root decorative layer', () => {
    const layout = readFileSync(new URL('./[locale]/(captain)/captain/layout.tsx', import.meta.url), 'utf8');
    expect(layout).toContain('data-area="captain"');
    expect(captain).toContain("html:not([data-theme='light']):has([data-area='captain']) .bg-aurora");
    expect(tokens).toContain("html:not([data-theme='light']) [data-area='captain'] {");
    expect(captain).toContain('var(--color-calm) 12%');
    expect(captain).toContain('44px 44px');
    expect(captain).toContain('mask: radial-gradient');
  });

  it('keeps lights static on mobile, reduced motion and solid glass devices', () => {
    const lights = captain.split("html:not([data-theme='light']) [data-area='captain'] {")[0];
    expect(lights).not.toMatch(/(?:\bfilter:\s*blur|animation:|@keyframes|will-change:)/);
    expect(captain).toContain('radial-gradient');
  });

  it('keeps muted text above AA at the brightest top light with a featured fill', () => {
    const rgb = (name: string) => {
      const hex = tokens.match(new RegExp(`--color-${name}: #([0-9a-f]{6})`))?.[1];
      if (!hex) throw new Error(`Missing ${name}`);
      return [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
    };
    const mix = (base: number[], light: number[], alpha: number) =>
      base.map((value, index) => value * (1 - alpha) + (light[index] ?? 0) * alpha);
    const luminance = (color: number[]) => color.reduce((sum, value, index) => {
      const channel = value / 255;
      return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
        * ([.2126, .7152, .0722][index] ?? 0);
    }, 0);
    let background = mix(rgb('bg-deep'), rgb('lime'), .16);
    background = mix(background, rgb('silver-1'), .025);
    expect(tokens).toContain('--glass-strong-tint: color-mix(in srgb, var(--color-ink) 6.5%, var(--color-surface))');
    const strong = mix(rgb('surface'), rgb('ink'), .065);
    expect((luminance(rgb('muted')) + .05) / (luminance(background) + .05)).toBeGreaterThanOrEqual(4.5);
    background = strong;
    background = mix(background, rgb('lime'), .08);
    expect((luminance(rgb('muted')) + .05) / (luminance(background) + .05)).toBeGreaterThanOrEqual(4.5);
  });

  it('disables card blur through the shared variable while retaining overlay exceptions', () => {
    expect(captain).toContain('--glass-blur-filter: none');
    expect(captain).toContain(':is(aside, nav, dialog, [role=\'dialog\'], .sheet)');
    expect(captain).toContain('--glass-blur-filter: blur(24px)');
    expect(captain).toContain(':is(.glass-strong, .glass-featured)::before');
    expect(captain).toContain('mask-composite: exclude');
  });

  it('removes rims for each transparency fallback', () => {
    expect(captain).toMatch(/html\[data-glass='solid'\][\s\S]*?content: none/);
    expect(captain).toMatch(/@supports not[\s\S]*?content: none/);
    expect(captain).toMatch(/@media \(prefers-reduced-transparency: reduce\)[\s\S]*?content: none/);
  });

  it('limits the new token overrides to dark captain descendants', () => {
    const block = tokens.match(/html:not\(\[data-theme='light'\]\) \[data-area='captain'\] \{([^}]+)\}/)?.[1];
    expect(block).toBeDefined();
    expect(block).not.toMatch(/\n\s*--(?:color|shadow)-/);
    expect(tokens.match(/\[data-area='captain'\]/g)).toHaveLength(1);
  });

  it('uses existing glow tokens only on primary actions', () => {
    expect(captain).toMatch(/\.primary-surface \{[^}]*box-shadow: var\(--shadow-lime-glow\)/);
    expect(captain).toMatch(/\.primary-surface:hover:not\(:disabled\) \{ box-shadow: var\(--shadow-lime-glow-hover\)/);
  });
});

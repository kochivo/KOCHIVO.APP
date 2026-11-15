import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve('src/app/globals.css'), 'utf8');
const stack = (name: string) => css.match(new RegExp(`--font-${name}:\\s*([^;]+);`))?.[1] ?? '';

it('puts the Arabic faces before any Arial-based metric fallback', () => {
  for (const [name, arabic] of [['sans', 'Alexandria'], ['display', 'Changa']] as const) {
    const families = stack(name).split(',').map(family => family.trim().replace(/['"]/g, ''));
    expect(families[0], name).toBe('Manrope');
    expect(families.indexOf(arabic), name).toBeGreaterThan(0);
    const firstFallback = families.findIndex(family => family.endsWith('Fallback'));
    expect(families.indexOf(arabic), name).toBeLessThan(firstFallback);
    expect(stack(name), name).not.toContain('var(--font-manrope)');
  }
});

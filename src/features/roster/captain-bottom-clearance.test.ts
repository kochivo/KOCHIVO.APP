import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('clears the floating controls above mobile tabs with the shared card gap', () => {
  const frame = readFileSync(new URL('./components/captain-workspace-frame.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  expect(frame).toContain('captain-content');
  expect(css).toContain('padding-block-end: var(--captain-content-clearance)');
  expect(css).toContain('calc(var(--nav-clearance) + 0.5rem + 3.25rem + 3rem + var(--spacing-card-gap))');
});

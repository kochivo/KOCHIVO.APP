import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('clears the floating controls above mobile tabs with the shared card gap', () => {
  const frame = readFileSync(new URL('./components/captain-workspace-frame.tsx', import.meta.url), 'utf8');
  expect(frame).toContain('calc(var(--nav-clearance)+0.5rem+3.25rem+var(--spacing-stack)+var(--spacing-card-gap))');
  expect(frame).toContain('min-[760px]:pb-20');
});

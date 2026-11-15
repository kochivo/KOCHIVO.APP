import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('clips the finish hero decorations sideways so the screen never scrolls horizontally', () => {
  const source = readFileSync('src/features/workout/components/finish-hero.tsx', 'utf8');
  expect(source).toMatch(/className="relative flex flex-col gap-card-gap overflow-x-clip pt-\[134px\]"/);
});

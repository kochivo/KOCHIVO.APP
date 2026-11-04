import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../app/[locale]');
function segments(directory: string): string[] {
  return [directory, ...readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'workout')
    .flatMap(entry => segments(path.join(directory, entry.name)))];
}

it.each(['(player)/player', '(captain)/captain'])('provides loading feedback in every %s segment', area => {
  const missing = segments(path.join(root, area))
    .filter(directory => !existsSync(path.join(directory, 'loading.tsx')))
    .map(directory => path.relative(root, directory));
  expect(missing).toEqual([]);
});

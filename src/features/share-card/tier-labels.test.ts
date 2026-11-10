import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { TIERS, ranksMessages } from '@/features/ranks';
import { messages } from './messages';

it('keeps share-card tier names identical to the rank screen', () => {
  for (const locale of ['ar', 'en'] as const) {
    for (const { tier } of TIERS) expect(messages[locale][tier]).toBe(ranksMessages[locale][tier]);
  }
});

it('imports only types from the ranks feature, keeping its client screens out of OG image entries', () => {
  const source = readFileSync(resolve('src/features/share-card/rank-image.tsx'), 'utf8');
  const valueImports = source.split('\n').filter(line => /^import (?!type ).*'@\/features\/ranks'/.test(line));
  expect(valueImports).toEqual([]);
});

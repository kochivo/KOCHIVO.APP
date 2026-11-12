import { expect, it } from 'vitest';
import { tierOperation } from './tier-operations';
import { catalogFixture } from './catalog-fixture';
import type { Tables } from '@/types/database';
import type { ActionResult } from '../types';

it.each(['returned', 'thrown'])('restores previous featured tier when the final %s write fails', async mode => {
  const before = catalogFixture.tiers[0];
  if (!before) throw new Error('Missing tier fixture');
  let featured = true;
  const result = await tierOperation([{ before, after: { ...before, is_featured: false } }], async input => {
    featured = input.is_featured;
    return { data: { ...before, ...input } };
  }, async (): Promise<ActionResult<true>> => {
    expect(featured).toBe(false);
    if (mode === 'thrown') throw new Error('offline');
    return { error: 'denied' };
  }, 'failure');
  expect(result).toEqual({ error: mode === 'thrown' ? 'offline' : 'denied' });
  expect(featured).toBe(true);
});
it('restores previously saved positions when reordering fails partway', async () => {
  const first = catalogFixture.tiers[0];
  if (!first) throw new Error('Missing tier fixture');
  const second = { ...first, id: 'second', position: 1 };
  const positions = new Map([[first.id, 0], [second.id, 1]]);
  const save = async (input: { id: string; position: number }): Promise<ActionResult<Tables<'captain_package_tiers'>>> => {
    if (input.id === 'second') return { error: 'denied' };
    positions.set(input.id, input.position);
    return { data: { ...first, ...input } };
  };
  const result = await tierOperation([{ before: first, after: { ...first, position: 1 } }, { before: second, after: { ...second, position: 0 } }], save, async () => ({ data: true }), 'failure');
  expect(result).toEqual({ error: 'denied' });
  expect([...positions.values()]).toEqual([0, 1]);
});

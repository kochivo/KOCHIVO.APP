import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { KoActor } from './account';
import { resolveContext } from './route';
import { executeIntent } from './execute';

const playerId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const actor = { id: actorId, role: 'captain', db: {
  rpc: async () => ({ data: [{ player_id: playerId, full_name: 'Ahmed' }], error: null }),
} } as unknown as KoActor;

it('silently drops foreign, malformed and unknown context', async () => {
  expect(await resolveContext(actor, { screen: 'player', playerId: actorId })).toBeUndefined();
  expect(await resolveContext(actor, '{')).toBeUndefined();
  expect(await resolveContext(actor, { screen: 'player', playerId: 'invalid' })).toBeUndefined();
  expect(await resolveContext(actor, { screen: 'player', playerId, name: 'Forged' })).toBeUndefined();
});

it('resolves the caller roster and defaults an omitted target to that player', async () => {
  const context = await resolveContext(actor, JSON.stringify({ screen: 'player', playerId }));
  expect(context).toEqual({ id: playerId, name: 'Ahmed' });
  const result = await executeIntent(actor, { kind: 'send_reminder', args: {} }, 'en', 's'.repeat(32), 1_800_000_000_000, context);
  expect(result.kind).toBe('confirm');
  expect(result.text).toContain('Ahmed');
});

it('an explicit unknown player wins over the context default', async () => {
  const result = await executeIntent(actor, { kind: 'send_reminder', args: { player: 'Foreign' } }, 'en', 's'.repeat(32), 1_800_000_000_000, { id: playerId, name: 'Ahmed' });
  expect(result.kind).toBe('message');
});

it('a player can only supply their own identity as page context', async () => {
  const player = { ...actor, role: 'player' as const };
  expect(await resolveContext(player, { screen: 'player', playerId })).toBeUndefined();
  expect(await resolveContext(player, { screen: 'player', playerId: actorId })).toEqual({ id: actorId, name: '' });
});

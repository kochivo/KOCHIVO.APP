import { afterEach, expect, it, vi } from 'vitest';
import { createTimezoneSync } from './sync';

afterEach(() => vi.unstubAllEnvs());
it('sends one update for concurrent renders and never overwrites manual mode', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const writes: string[] = [];
  const sync = createTimezoneSync(async (_id, zone) => { writes.push(zone); });
  const profile = { id: 'p', timezone: 'Africa/Cairo', timezone_auto: true };
  await sync.run({ ...profile, timezone_auto: false }, 'Asia/Dubai');
  expect(writes).toEqual([]);
  await Promise.all([sync.run(profile, 'Asia/Dubai'), sync.run(profile, 'Asia/Dubai')]);
  await sync.run(profile, 'Asia/Dubai');
  expect(writes).toEqual(['Asia/Dubai']);
  await sync.run({ ...profile, timezone: 'Asia/Dubai' }, 'Asia/Dubai');
  expect(writes).toEqual(['Asia/Dubai']);
  await sync.run(profile, 'Pacific/Auckland');
  expect(writes).toEqual(['Asia/Dubai', 'Pacific/Auckland']);
  await sync.run(profile, 'Asia/Dubai');
  await sync.run(profile, 'Africa/Cairo');
  expect(writes).toEqual(['Asia/Dubai', 'Pacific/Auckland', 'Asia/Dubai', 'Africa/Cairo']);
});
it('does no work with the flag off', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  const writes: string[] = [];
  const sync = createTimezoneSync(async (_id, zone) => { writes.push(zone); });
  await sync.run({ id: 'p', timezone: 'Africa/Cairo', timezone_auto: true }, 'Asia/Dubai');
  expect(writes).toEqual([]);
});

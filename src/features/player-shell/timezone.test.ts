import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setLocalUser } from '@/core/offline/db';
import { readCaptainCache, writeCaptainCache } from './hooks/use-my-captain';
import { accessState } from './access';
import { localDate } from '@/lib/dates';

vi.mock('./data/my-captain', () => ({ fetchMyCaptain: vi.fn() }));
beforeEach(async () => { await setLocalUser('timezone-player'); });
afterEach(async () => { await setLocalUser(null); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('retains the captain package clock in the offline cache', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  let saved = '';
  vi.stubGlobal('window', { localStorage: { setItem: (_key: string, value: string) => { saved = value; }, getItem: () => saved } });
  writeCaptainCache({ fullName: 'Coach', phone: null, accessUntil: '2026-01-01', archivedAt: null,
    startedOn: '2025-12-01', timezone: 'America/New_York' });
  const cached = readCaptainCache();
  expect(cached?.timezone).toBe('America/New_York');
  const now = new Date('2026-01-02T02:00:00Z');
  expect(accessState({ ...cached, accessUntil: '2026-01-01', archivedAt: null,
    today: localDate(now, cached?.timezone) })).toBe('ending');
});

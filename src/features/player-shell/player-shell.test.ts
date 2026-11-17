import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocalUser } from '@/core/offline/db';
import { playerNav, showsFeedback, showsNav } from './nav';
import { accessState } from './access';
import { whatsappUrl } from '@/lib/whatsapp';
import { readCaptainCache, writeCaptainCache } from './hooks/use-my-captain';

vi.mock('./data/my-captain', () => ({ fetchMyCaptain: vi.fn() }));
beforeEach(async () => { await setLocalUser('cache-player'); });
afterEach(async () => { await setLocalUser(null); vi.unstubAllGlobals(); });

describe('player navigation', () => {
  it.each(['/player', '/player/nutrition', '/player/progress/x', '/player/captain'])(
    'selects the matching tab for %s', (path) => {
      const active = playerNav(path).filter((item) => item.active);
      expect(active).toHaveLength(1);
      expect(active[0]?.href).toBe(path.replace('/x', ''));
    },
  );
  it('does not match unrelated prefixes or make home a fallback', () => {
    expect(playerNav('/player/nutritionist').some((item) => item.active)).toBe(false);
    expect(playerNav('/player/unknown').some((item) => item.active)).toBe(false);
  });
  it.each([['/player/workout/day', false], ['/player/onboarding', false], ['/player', true]] as const)(
    'nav visibility for %s', (path, visible) => expect(showsNav(path)).toBe(visible),
  );
  it('hides the floating feedback button only on the v3 chat', () => {
    expect(showsFeedback('/player/captain', true)).toBe(false);
    expect(showsFeedback('/player/captain', false)).toBe(true);
    expect(showsFeedback('/player/captain/profile', true)).toBe(true);
    expect(showsFeedback('/player/workout/day', true)).toBe(false);
  });
});

describe('subscription access', () => {
  const base = { today: '2026-11-03', accessUntil: '2026-11-07', archivedAt: null };
  it('is active with more than three days left', () => expect(accessState(base)).toBe('active'));
  it('is ending at three days and on the final day', () => {
    expect(accessState({ ...base, accessUntil: '2026-11-06' })).toBe('ending');
    expect(accessState({ ...base, accessUntil: base.today })).toBe('ending');
  });
  it('ends the day after access expires', () => {
    expect(accessState({ ...base, accessUntil: '2026-11-02' })).toBe('ended');
  });
  it('prioritizes archive', () => {
    expect(accessState({ ...base, archivedAt: '2026-11-01T12:00:00Z' })).toBe('archived');
  });
  it('handles month boundaries', () => {
    expect(accessState({ ...base, today: '2026-10-30', accessUntil: '2026-11-02' })).toBe('ending');
  });
  it('does not expire a subscription awaiting plans', () => {
    expect(accessState({ ...base, today: '2027-01-01', awaitingPlansAt: '2026-11-01T00:00Z' })).toBe('active');
  });
});

it('builds WhatsApp URLs from digits only', () => {
  expect(whatsappUrl({ phone: '+20 100-123-4567' })).toBe('https://wa.me/201001234567');
  expect(whatsappUrl({ phone: '' })).toBeNull();
  expect(whatsappUrl({ phone: ' + ' })).toBeNull();
});

describe('captain cache', () => {
  it('preserves the subscription start offline', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      setItem: (key: string, value: string) => storage.set(key, value),
      getItem: (key: string) => storage.get(key),
    } });
    writeCaptainCache({ fullName: 'Coach', phone: null, accessUntil: '2026-12-01', archivedAt: null, startedOn: null,
      subscriptionStartsOn: '2026-11-10' });
    expect(readCaptainCache()?.subscriptionStartsOn).toBe('2026-11-10');
  });
  it('survives a blocked localStorage getter', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
    expect(readCaptainCache()).toBeNull();
    expect(() => writeCaptainCache(null)).not.toThrow();
  });
  it('reads valid data and rejects malformed cache', () => {
    const data = { fullName: 'كابتن', phone: null, accessUntil: '2026-11-06', archivedAt: null };
    const getItem = vi.fn().mockReturnValue(JSON.stringify(data));
    vi.stubGlobal('window', { localStorage: { getItem } });
    expect(readCaptainCache()).toEqual({ ...data, startedOn: null });
    getItem.mockReturnValue('{');
    expect(readCaptainCache()).toBeNull();
  });
  it('persists only the permitted fields', () => {
    const setItem = vi.fn();
    vi.stubGlobal('window', { localStorage: { setItem } });
    writeCaptainCache({ fullName: 'كابتن', phone: null, accessUntil: '2026-11-06', archivedAt: null, startedOn: '2026-01-01' });
    expect(setItem).toHaveBeenCalledWith('kochivo.my-captain.cache-player', JSON.stringify({
      fullName: 'كابتن', phone: null, accessUntil: '2026-11-06', archivedAt: null,
    }));
  });
  it('keeps public branding offline and discards legacy private phone values', () => {
    const data = { fullName: 'Ali', phone: '+201012345678', accessUntil: '2026-11-06', archivedAt: null,
      bio: 'Coach', social: { instagram: 'https://instagram.com/ali' } };
    vi.stubGlobal('window', { localStorage: { getItem: () => JSON.stringify(data) } });
    expect(readCaptainCache()).toEqual({ ...data, phone: null, startedOn: null });
  });
});

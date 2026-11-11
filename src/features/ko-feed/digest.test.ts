import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { LeaderboardRow } from '@/features/ranks';
import { buildDigest } from './digest';

// These cases cover the crown line; the hidden-ranks case stubs its own value.
vi.stubEnv('NEXT_PUBLIC_RANKS_ENABLED', '1');
import { KoDigest } from '../ko-preview/components/ko-digest';
import type { KoFeedItem } from './types';

const row = (kind: 'inactive' | 'expiring' | 'expired', id: string = kind): KoFeedItem => ({
  key: kind + id, kind, severity: 'urgent', player_id: id, player_name: 'Ahmed', data: {},
});
const crown: LeaderboardRow = { player_id: 's', display_name: 'Sara', adherence: 86, done: 6,
  planned: 8, is_crown: true, position: 1, lifetime: 100, monthly: 10, tier: 'champion' };
const pr = { player_name: 'Ahmed', exercise: { ar: 'السكوات', en: 'Squat' } };

it.each(['ar', 'en'] as const)('orders four lines and renders a passive KO card in %s', locale => {
  const lines = buildDigest([row('inactive'), row('expiring')], { board: [crown], records: [pr] }, locale);
  expect(lines).toHaveLength(4);
  expect(lines[0]).toContain(locale === 'ar' ? 'متمرّنش' : 'inactive');
  expect(lines[1]).toContain(locale === 'ar' ? 'اشتراك' : 'subscription');
  expect(lines[2]).toContain('Ahmed');
  expect(lines[2]).toContain(pr.exercise[locale]);
  expect(lines[3]).toContain('Sara');
  expect(lines[3]).toContain('86');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(KoDigest, { rows: [], extras: null, avatar: createElement('img', { src: '/ko.png', alt: '' }) })));
  expect(html).toContain('glass-strong');
  expect(html).toContain('/ko.png');
  expect(html).toContain(locale === 'ar' ? 'النهارده كله تمام' : 'All clear today');
  expect(html).not.toContain('<button');
});

it('omits zero lines, deduplicates players and combines ending and ended subscriptions', () => {
  expect(buildDigest([], { board: [{ ...crown, is_crown: false }], records: [] }, 'en')).toEqual(['All clear today']);
  expect(buildDigest([row('expiring', 'a'), row('expired', 'a'), row('expired', 'b')], null, 'en'))
    .toEqual(['2 subscriptions ending or ended']);
  expect(buildDigest([row('inactive'), row('inactive')], null, 'en')).toEqual(['1 inactive player']);
});

it('uses Arabic singular, dual and plural and counts multiple PR events', () => {
  expect(buildDigest([row('inactive')], null, 'ar')[0]).toBe('لاعب واحد متمرّنش من 5 أيام');
  expect(buildDigest([row('inactive', 'a'), row('inactive', 'b')], null, 'ar')[0]).toContain('لاعبين');
  expect(buildDigest(['a', 'b', 'c'].map(id => row('inactive', id)), null, 'ar')[0]).toContain('3 لاعيبة');
  expect(buildDigest([], { board: [], records: [pr, pr] }, 'en')).toEqual(['2 new records yesterday']);
  expect(buildDigest([], { board: [], records: [pr, pr] }, 'ar')).toEqual(['رقمين جداد امبارح']);
});

vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: vi.fn() }));
vi.mock('@/features/ranks', () => ({ loadLeaderboard: vi.fn(), CROWN_MIN_WORKOUTS: 4 }));

it('falls back to feed-only lines when extras fail', async () => {
  const { loadSupabaseBrowser } = await import('@/core/supabase/lazy');
  vi.mocked(loadSupabaseBrowser).mockRejectedValueOnce(new Error('offline'));
  const { loadDigestExtras } = await import('./data/load-digest-extras');
  const extras = await loadDigestExtras(new Date('2026-11-10T12:00:00Z'));
  expect(extras).toBeNull();
  expect(buildDigest([row('inactive')], extras, 'en')).toEqual(['1 inactive player']);
});

it('reads only yesterday’s counted PRs for the captain across Cairo midnight', async () => {
  const { loadSupabaseBrowser } = await import('@/core/supabase/lazy');
  const { loadLeaderboard } = await import('@/features/ranks');
  const { loadDigestExtras, digestYesterday } = await import('./data/load-digest-extras');
  const now = new Date('2026-11-09T22:30:00Z');
  expect(digestYesterday(now)).toBe('2026-11-09');
  expect(digestYesterday(new Date('2026-01-01T12:00:00Z'))).toBe('2025-12-31');
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [{ player_id: 's', source_key: 'session:exercise' }], error: null }) };
  const exercise = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({
    data: [{ id: 'exercise', name_ar: 'سكوات', name_en: 'Squat' }], error: null,
  }) };
  const db = { auth: { getUser: async () => ({ data: { user: { id: 'captain' } }, error: null }) },
    from: (table: string) => table === 'points_log' ? query : exercise };
  vi.mocked(loadSupabaseBrowser).mockResolvedValueOnce(db as unknown as Awaited<ReturnType<typeof loadSupabaseBrowser>>);
  vi.mocked(loadLeaderboard).mockResolvedValueOnce([crown]);
  expect(await loadDigestExtras(now)).toEqual({ board: [crown], records: [{ player_name: 'Sara', exercise: { ar: 'سكوات', en: 'Squat' } }] });
  for (const pair of [['captain_id', 'captain'], ['kind', 'pr'], ['status', 'counted'], ['earned_on', '2026-11-09']])
    expect(query.eq).toHaveBeenCalledWith(...pair);
});

it('leaves the crown line out while ranks are hidden', () => {
  vi.stubEnv('NEXT_PUBLIC_RANKS_ENABLED', '');
  try {
    const lines = buildDigest([row('inactive')], { board: [crown], records: [] }, 'en');
    expect(lines.join(' ')).not.toContain('Sara');
  } finally {
    vi.stubEnv('NEXT_PUBLIC_RANKS_ENABLED', '1');
  }
});

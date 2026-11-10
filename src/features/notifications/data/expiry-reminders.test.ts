import { expect, it, vi } from 'vitest';
import { latestNotifications } from './notifications';

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: load }));

it('preserves the captain name when loading player expiry notifications', async () => {
  const data = ['subscription_expiring', 'subscription_expired'].map(type => ({
    id: type, type, is_read: false, created_at: '2026-11-03T06:05:00Z',
    payload: { captain_name: 'Mona', access_until: '2026-11-06', days_left: 3 },
  }));
  const query = { select: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data, error: null }) };
  query.select.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.order.mockReturnValue(query);
  load.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
  const rows = await latestNotifications();
  expect(rows.map(row => row.payload.captain_name)).toEqual(['Mona', 'Mona']);
});

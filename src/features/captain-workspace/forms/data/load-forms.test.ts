import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { loadForms } from './load-forms';

it('reads past the server page size without limiting form history', async () => {
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), order: vi.fn(() => query),
    range: vi.fn().mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ id: String(i),
      created_at: '2026-11-11T12:00:00Z', body_weight_kg: 82, waist_cm: null, notes: null,
      body_fat_pct: null, photo_paths: [], reviewed_at: null, captain_reply: null })), error: null })
      .mockResolvedValueOnce({ data: [], error: null }) };
  const intake = { select: vi.fn(() => intake), eq: vi.fn(() => intake), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
  const from = vi.fn((table: string) => table === 'player_intake' ? intake : query);
  const forms = await loadForms({ from } as unknown as SupabaseClient<AppDatabase>, 'player', '2026-11-11');
  expect(forms).toHaveLength(500);
  expect(query.range.mock.calls).toEqual([[0, 499], [500, 999]]);
  expect(query.eq).toHaveBeenCalledWith('player_id', 'player');
  expect(intake.eq).toHaveBeenCalledWith('player_id', 'player');
});
it.each(['player_intake', 'check_ins'])('propagates %s read failure rather than returning empty data', async table => {
  const query = { select: () => query, eq: () => query, order: () => query,
    range: async () => ({ data: [], error: table === 'check_ins' ? new Error('denied') : null }),
    maybeSingle: async () => ({ data: null, error: table === 'player_intake' ? new Error('denied') : null }) };
  await expect(loadForms({ from: () => query } as unknown as SupabaseClient<AppDatabase>, 'player', '2026-11-11')).rejects.toThrow('denied');
});

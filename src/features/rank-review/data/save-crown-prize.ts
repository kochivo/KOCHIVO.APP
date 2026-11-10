import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { currentMonth, nextMonth } from '../months';

export function canEditPrize(month: string, now: Date): boolean {
  const current = currentMonth(now);
  return month === current || month === nextMonth(current);
}

export function normalizePrize(value: string): string | null {
  const prize = value.trim();
  if (!prize) return null;
  const length = Array.from(prize).length;
  if (length < 2 || length > 120) throw new Error('Invalid prize length');
  return prize;
}

export async function persistPrize(prize: string | null, previous: string | null,
  show: (value: string | null) => void, write: () => Promise<void>): Promise<void> {
  show(prize);
  try { await write(); } catch (error) { show(previous); throw error; }
}

export async function saveCrownPrize(month: string, prize: string | null): Promise<void> {
  const db = await loadSupabaseBrowser();
  const { data, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!data.user) throw new Error('Authentication required');
  const query = prize === null
    ? db.from('crown_prizes').delete().eq('captain_id', data.user.id).eq('month', month)
    : db.from('crown_prizes').upsert({ captain_id: data.user.id, month, prize }, { onConflict: 'captain_id,month' });
  const { error } = await query;
  if (error) throw error;
}

import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { loadLeaderboard } from '@/features/ranks';
import { localDate } from '@/lib/dates';
import type { DigestExtras } from '../digest';

export function digestYesterday(now: Date): string {
  const date = new Date(`${localDate(now)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return localDate(date, 'UTC');
}

export async function loadDigestExtras(now: Date = new Date()): Promise<DigestExtras | null> {
  try {
    const db = await loadSupabaseBrowser();
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || !auth.user) return null;
    const [board, result] = await Promise.all([
      loadLeaderboard(),
      db.from('points_log').select('player_id,source_key').eq('captain_id', auth.user.id)
        .eq('kind', 'pr').eq('status', 'counted').eq('earned_on', digestYesterday(now)).order('id'),
    ]);
    if (result.error) throw result.error;
    const { digestEvents } = await import('./feed-schemas');
    const events = digestEvents.parse(result.data);
    if (!events.length) return { board, records: [] };
    const ids = [...new Set(events.map(row => row.source_key.split(':')[1]).filter((id): id is string => Boolean(id)))];
    const exercises = ids.length ? await db.from('exercises').select('id,name_ar,name_en').in('id', ids) : { data: [], error: null };
    if (exercises.error) throw exercises.error;
    const records = events.flatMap(row => {
      const exercise = exercises.data?.find(item => item.id === row.source_key.split(':')[1]);
      const player = board.find(item => item.player_id === row.player_id);
      // A record without a known player or exercise is skipped so the rest of the digest still shows.
      return exercise && player ? [{ player_name: player.display_name, exercise: { ar: exercise.name_ar ?? exercise.name_en, en: exercise.name_en } }] : [];
    });
    return { board, records };
  } catch { return null; }
}

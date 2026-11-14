import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { getPlayerTimezone, getTimezone } from '@/core/timezone/server';
import { readPlayerPrograms, readProgram } from '@/features/programs/server';
import { localDate } from '@/lib/dates';
import { readPlayerProfile } from '../../player-file/profile-data';
import { loadSummary } from '../../player-file/load-summary';
import { programSummary } from '../player-program-model';

export async function loadPlayerProgram(playerId: string, now: Date) {
  try {
    const [profile, programs] = await Promise.all([readPlayerProfile(playerId), readPlayerPrograms(playerId)]);
    if (profile.error || programs.error !== undefined) return { error: true } as const;
    if (!profile.data) return { missing: true } as const;
    const current = programs.data.find(row => row.status === 'active');
    const loaded = current ? await readProgram(current.id) : null;
    if (loaded && loaded.error !== undefined) return { error: true } as const;
    const timezone = profile.data.timezone ?? await getPlayerTimezone(playerId);
    const today = localDate(now, timezone);
    const summary = await loadSummary(playerId, today);
    return { data: { profile: profile.data, timezone, today, summary,
      captainToday: localDate(now, await getTimezone()),
      program: loaded?.data ? programSummary(loaded.data) : null,
      draftId: programs.data.find(row => row.status === 'draft')?.id,
    } };
  } catch (error) { unstable_rethrow(error); return { error: true } as const; }
}

import type { fetchPlayerProfile } from '@/features/player-profile';
import type { PlayerFile } from '@/features/player-file';
import type { Tables } from '@/types/database';

export type Profile = NonNullable<Awaited<ReturnType<typeof fetchPlayerProfile>>['data']>;
export type PlayerFileTab = 'overview' | 'training' | 'nutrition' | 'assessments' | 'chat' | 'checkins';
export type Subscription = Pick<Tables<'coach_clients'>, 'access_until' | 'started_on' | 'pending' | 'frozen_at' | 'sessions_left'>;
export interface FileSummary {
  tier?: { name: string; color: string; is_featured?: boolean } | null;
  file: PlayerFile;
  subscription: Subscription;
  lastTraining: string | null;
  completedDays: number;
  assessment: { title: string; next: string | null; last: string | null } | null;
}

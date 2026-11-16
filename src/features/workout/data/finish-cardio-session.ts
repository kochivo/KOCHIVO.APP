import type { KochivoDB, SnapshotDay } from '@/core/offline';
import { isCardioOnly } from '../queue';
import { finishSession, startSession } from './log-set';

export async function finishCardioSession(db: KochivoDB, day: SnapshotDay, today: string, now: number): Promise<void> {
  if (!isCardioOnly(day)) return;
  const session = await startSession(db, day, today, now);
  await finishSession(db, session.id, now);
}

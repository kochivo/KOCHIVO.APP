import { checkinSnapshot, compareSnapshots, intakeSnapshot } from '@/features/player-file';
import type { IntakeRow, Snapshot, SnapshotComparison } from '@/features/player-file';
import type { Tables } from '@/types/database';

export interface PlayerForm {
  snapshot: Snapshot;
  previous?: Snapshot;
  comparison: SnapshotComparison[];
  reviewedAt: string | null;
  reply: string | null;
  photoCount: number;
  bodyFat: number | null;
  previousBodyFat?: number | null;
}

export function adaptForms(intake: IntakeRow | null, checkins: readonly Tables<'check_ins'>[], today: string): PlayerForm[] {
  const intakeForm = intake?.completed_at ? intakeSnapshot(intake, today) : null;
  const ordered = [...checkins].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const forms: PlayerForm[] = ordered.map((row, index) => {
    const snapshot = checkinSnapshot(row);
    const older = ordered[index + 1];
    const previous = older ? checkinSnapshot(older) : undefined;
    // The intake target supplies context, never a previous answer from a different kind.
    const context = { ...snapshot, facts: { ...snapshot.facts, targetWeight: intakeForm?.facts.targetWeight,
      weight: snapshot.facts.weight ?? intakeForm?.facts.weight } };
    return { snapshot, previous, comparison: compareSnapshots(context, previous).filter(row => snapshot.facts[row.key] !== undefined),
      reviewedAt: row.reviewed_at, reply: row.captain_reply, photoCount: row.photo_paths.length,
      bodyFat: row.body_fat_pct, previousBodyFat: older?.body_fat_pct };
  });
  if (intakeForm) forms.push({ snapshot: intakeForm, comparison: compareSnapshots(intakeForm),
    reviewedAt: null, reply: null, photoCount: 0, bodyFat: null });
  return forms.sort((a, b) => b.snapshot.source.at.localeCompare(a.snapshot.source.at)
    || b.snapshot.source.id.localeCompare(a.snapshot.source.id));
}

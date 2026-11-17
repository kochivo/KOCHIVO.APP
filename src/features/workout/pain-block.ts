import type { SnapshotExercise } from '@/core/offline';
import type { PainReportRow } from '@/core/offline/pain-tables';
import { painAffects, painBlockedParts } from './pain-safe-swap';

const knownParts = new Set(Object.values(painBlockedParts).flat());

export function painBlocksExercise(reports: readonly PainReportRow[], exercise: SnapshotExercise | undefined,
  selectedId?: string): boolean {
  if (!exercise) return false;
  const metadata = exercise.alternative_exercises?.find(row => row.id === exercise.exercise_id) ?? exercise;
  return reports.some(report => {
    if (report.program_exercise_id !== exercise.id) {
      if (!knownParts.has(metadata.body_part?.toLowerCase() ?? '')) {
        return report.kind === 'sharp' || report.severity === 5 || report.area === 'other';
      }
      return painAffects(report.area, metadata);
    }
    return (!selectedId || selectedId === report.exercise_id) &&
      (report.severity === 5 || report.kind === 'sharp' || painAffects(report.area, metadata));
  });
}

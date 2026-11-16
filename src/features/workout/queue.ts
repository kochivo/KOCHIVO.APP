import type { SnapshotDay, SnapshotExercise } from '@/core/offline';
import { targetForSet } from '@/lib/set-plan';

export interface WorkoutStep {
  exercise: SnapshotExercise;
  setIndex: number;
  restAfter: number;
  dropIndex?: number;
}

export function isCardioOnly(day: SnapshotDay): boolean {
  return Boolean(day.cardio?.length) && buildQueue(day).length === 0;
}

export function buildQueue(day: SnapshotDay): WorkoutStep[] {
  const ordered = [...day.exercises].sort((a, b) => a.position - b.position);
  const visited = new Set<string>();
  const queue: WorkoutStep[] = [];
  for (const exercise of ordered) {
    if (visited.has(exercise.id)) continue;
    const group = exercise.superset_group === null ? [exercise] :
      ordered.filter((item) => item.superset_group === exercise.superset_group);
    group.forEach((item) => visited.add(item.id));
    const rounds = Math.max(...group.map((item) => item.sets));
    for (let setIndex = 1; setIndex <= rounds; setIndex++) {
      const round = group.filter((item) => item.sets >= setIndex);
      round.forEach((item, index) => {
        const count = targetForSet(item, setIndex - 1).drop?.count ?? 0;
        for (let dropIndex = 0; dropIndex <= count; dropIndex++) queue.push({
          exercise: item, setIndex, dropIndex,
          restAfter: dropIndex === count && index === round.length - 1 ? item.rest_seconds : 0,
        });
      });
    }
  }
  const final = queue.at(-1);
  if (final) final.restAfter = 0;
  return queue;
}

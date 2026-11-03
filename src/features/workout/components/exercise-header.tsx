import Image from 'next/image';
import type { SnapshotExercise } from '@/core/offline';
import { exerciseMediaUrl } from '@/core/storage';
import type { Performance } from '../data/last-performance';

export function ExerciseHeader({ exercise, performance }: { exercise: SnapshotExercise; performance: Performance | null | undefined }) {
  const name = exercise.name_ar || exercise.name_en;
  return <section className="glass flex items-center gap-4 rounded-card p-4">
    {exercise.media_path && <figure className="shrink-0 text-center">
      <Image src={exerciseMediaUrl(exercise.media_path)} alt={name} width={84} height={84}
        unoptimized className="rounded-control" />
      <figcaption className="mt-1 text-xs text-muted">© Gym visual</figcaption>
    </figure>}
    <div className="space-y-2">
      <h1 className="text-2xl font-extrabold">{name}</h1>
      {performance && <p className="text-sm text-muted">الأسبوع اللي فات · <bdi>{performance.weight_kg ?? 0} × {performance.reps ?? 0}</bdi></p>}
    </div>
  </section>;
}

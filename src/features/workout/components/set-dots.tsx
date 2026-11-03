import { Check } from 'lucide-react';
import type { SetLogRow, SnapshotExercise } from '@/core/offline';
import { cn } from '@/lib/cn';

export function SetDots({ exercise, currentIndex, doneSets, onEdit, disabled = false }: {
  exercise: SnapshotExercise; currentIndex: number; doneSets: SetLogRow[];
  onEdit: (row: SetLogRow) => void; disabled?: boolean;
}) {
  if (exercise.sets === 0) return <p className="text-muted">مفيش سِتات للتمرين ده</p>;
  return <div className="flex flex-wrap gap-2" aria-label="سِتات التمرين">
    {Array.from({ length: exercise.sets }, (_, index) => {
      const setIndex = index + 1;
      const done = doneSets.find((row) => row.program_exercise_id === exercise.id && row.set_index === setIndex);
      return <button key={setIndex} type="button" disabled={!done || disabled}
        aria-current={setIndex === currentIndex ? 'step' : undefined}
        aria-label={done ? `عدّل سِت ${setIndex}` : `سِت ${setIndex}`}
        onClick={() => { if (done) onEdit(done); }}
        className={cn('glass flex min-h-16 min-w-16 flex-1 flex-col items-center justify-center rounded-control px-2 py-2',
          setIndex === currentIndex && 'outline-2 outline-ink', done ? 'text-ink' : 'text-muted')}>
        <span className="flex items-center gap-1 text-sm">سِت {setIndex}{done && <Check className="size-4" aria-hidden />}</span>
        {done && <bdi className="text-sm font-bold">{done.weight_kg ?? 0} × {done.reps ?? 0}</bdi>}
      </button>;
    })}
  </div>;
}

import Image from 'next/image';
import { exerciseMediaUrl } from '@/core/storage';
import type { ProgramSnapshot } from '@/features/player-home';

export function PreviewProgram({ program }: { program: ProgramSnapshot | null }) {
  if (!program) return <p className="text-muted">لسه مفيش برنامج متفعل</p>;
  return <section className="space-y-4">
    <h2 className="text-xl font-bold">{program.title}</h2>
    {program.notes && <p className="text-muted">{program.notes}</p>}
    {program.days.length === 0 && <p className="text-muted">لسه مفيش أيام في البرنامج</p>}
    {program.days.map((day) => <section key={day.id} className="glass space-y-3 rounded-card p-3">
      <h3 className="font-bold">{day.title}</h3>
      {day.exercises.length === 0 && <p className="text-sm text-muted">لسه مفيش تمارين في اليوم ده</p>}
      <ul className="space-y-3">{day.exercises.map((exercise) => <li key={exercise.id} className="space-y-2 border-t border-line pt-3">
        <p className="font-bold">{exercise.name_ar || exercise.name_en}</p>
        {exercise.media_path && <Image unoptimized src={exerciseMediaUrl(exercise.media_path)}
          alt={exercise.name_ar || exercise.name_en} width={280} height={200} className="w-full rounded-control object-contain" />}
        <p className="text-sm">{exercise.sets} سِت × {exercise.reps_min}{exercise.reps_max !== null && exercise.reps_max !== exercise.reps_min ? `–${exercise.reps_max}` : ''} عدة</p>
        <p className="text-sm text-muted">راحة {exercise.rest_seconds} ثانية</p>
        {exercise.superset_group !== null && <p className="text-sm text-muted">سوبر سِت {exercise.superset_group}</p>}
        {program.settings.advanced && <p className="text-sm text-muted">
          {exercise.rpe !== null && `مجهود ${exercise.rpe} `}{exercise.tempo && `إيقاع ${exercise.tempo}`}
        </p>}
        {exercise.notes && <p className="text-sm text-muted">{exercise.notes}</p>}
      </li>)}</ul>
      {day.exercises.length > 0 && <p className="text-xs text-muted">© Gym visual</p>}
    </section>)}
  </section>;
}

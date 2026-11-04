'use client';
import { formatNumber } from '@/lib/format';
import { exerciseName } from '@/lib/display-name';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { ExerciseImage } from '@/ui/exercise-image';
import { Dumbbell } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { exerciseMediaUrl } from '@/core/storage';
import type { ProgramSnapshot } from '@/features/player-home';
import { starterText } from '@/lib/starter-text';

export function PreviewProgram({ program }: { program: ProgramSnapshot | null }) {
  const t = useT(messages);
  const locale = useLocale();
  if (!program) return <EmptyState icon={Dumbbell} title={t('noProgram')} body={t('emptyBody')} action={{ label: t('chooseTemplate'), href: '/captain/templates' }} />;
  const action = { label: t('editPlan'), href: `/captain/programs/${program.program_id}` };
  return <section className="space-y-4">
    <h2 className="text-xl font-bold">{starterText(program.title, locale)}</h2>
    {program.notes && <p className="text-muted">{starterText(program.notes, locale)}</p>}
    {program.days.length === 0 && <EmptyState icon={Dumbbell} title={t('noDays')} body={t('emptyBody')} action={action} />}
    {program.days.map((day) => <section key={day.id} className="glass space-y-3 rounded-card p-3">
      <h3 className="font-bold">{starterText(day.title, locale)}</h3>
      {day.exercises.length === 0 && <EmptyState icon={Dumbbell} title={t('noExercises')} body={t('emptyBody')} action={action} />}
      <ul className="space-y-3">{day.exercises.map((exercise) => <li key={exercise.id} className="space-y-2 border-t border-line pt-3">
        <p className="font-bold">{exerciseName(exercise, locale)}</p>
        {exercise.media_path && <ExerciseImage fullWidth src={exerciseMediaUrl(exercise.media_path)}
          alt={exerciseName(exercise, locale)} width={280} height={200} className="w-full rounded-control object-contain" />}
        <p className="text-sm">{t('sets', { n: exercise.sets, count: formatNumber(exercise.sets, locale) })} × {t('reps', { n: exercise.reps_max ?? exercise.reps_min, count: exercise.reps_max !== null && exercise.reps_max !== exercise.reps_min ? `${formatNumber(exercise.reps_min, locale)}–${formatNumber(exercise.reps_max, locale)}` : formatNumber(exercise.reps_min, locale) })}</p>
        <p className="text-sm text-muted">{t('rest', { n: exercise.rest_seconds, count: formatNumber(exercise.rest_seconds, locale) })}</p>
        {exercise.superset_group !== null && <p className="text-sm text-muted">{t('superset', { n: formatNumber(exercise.superset_group, locale) })}</p>}
        {program.settings.advanced && <p className="text-sm text-muted">
          {exercise.rpe !== null && t('rpe', { n: formatNumber(exercise.rpe, locale) })}{exercise.tempo && t('tempo', { tempo: exercise.tempo })}
        </p>}
        {exercise.notes && <p className="text-sm text-muted">{exercise.notes}</p>}
      </li>)}</ul>
    </section>)}
  </section>;
}

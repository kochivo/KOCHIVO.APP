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
import { supersetLabel, supersetTag } from '@/lib/superset';
import { messages as setMessages } from '@/lib/training/messages';
import { ExerciseVideo } from '@/features/workout';

export function PreviewProgram({ program, today = false }: { program: ProgramSnapshot | null; today?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const st = useT(setMessages);
  if (!program) return <EmptyState icon={Dumbbell} title={t('noProgram')} body={t('emptyBody')} action={{ label: t('chooseTemplate'), href: '/captain/templates' }} />;
  const action = { label: t('editPlan'), href: `/captain/programs/${program.program_id}` };
  return <section className="space-y-card-gap">
    {!today && <h2 className="text-xl font-bold">{starterText(program.title, locale)}</h2>}
    {program.notes && <p className="text-muted">{starterText(program.notes, locale)}</p>}
    {program.days.length === 0 && <EmptyState icon={Dumbbell} title={t('noDays')} body={t('emptyBody')} action={action} />}
    {program.days.map((day) => <section key={day.id} className="glass space-y-stack rounded-card p-stack">
      {!today && <h3 className="font-bold">{starterText(day.title, locale)}</h3>}
      {day.exercises.length === 0 && <EmptyState icon={Dumbbell} title={t('noExercises')} body={t('emptyBody')} action={action} />}
      <ul className="space-y-stack">{day.exercises.map((exercise, index) => <li key={exercise.id}
        className={`space-y-inline border-t pt-stack ${exercise.superset_group === null ? 'border-line' : 'rounded-card border border-lime/40 bg-lime-soft p-stack'}`}>
        {exercise.superset_group !== null && <div className="flex flex-wrap items-center gap-inline text-xs text-lime">
          <bdi>{supersetTag(day.exercises, exercise)}</bdi><span>{st('superset', { letter: supersetLabel(day.exercises, exercise) ?? '' })}</span>
          <span className="text-muted">{exercise.superset_group === day.exercises[index - 1]?.superset_group ? st('noRest') : st('rest', {
            seconds: day.exercises.filter(row => row.superset_group === exercise.superset_group).at(-1)?.rest_seconds ?? exercise.rest_seconds,
          })}</span>
        </div>}
        {exercise.set_plan?.some(set => set.drop) && <span className="inline-flex rounded-full bg-warn-soft px-stack py-inline text-xs text-warn">{st('drop')}</span>}
        <p className="font-bold">{exerciseName(exercise, locale)}</p>
        <ExerciseVideo url={exercise.video_url} name={exerciseName(exercise, locale)} compact />
        {exercise.media_path && <ExerciseImage fullWidth src={exerciseMediaUrl(exercise.media_path)}
          alt={exerciseName(exercise, locale)} width={280} height={158} className="w-full rounded-control object-contain" />}
        <p className="text-sm">{t('sets', { n: exercise.sets, count: formatNumber(exercise.sets, locale) })} × {t('reps', { n: exercise.reps_max ?? exercise.reps_min, count: exercise.reps_max !== null && exercise.reps_max !== exercise.reps_min ? `${formatNumber(exercise.reps_min, locale)}–${formatNumber(exercise.reps_max, locale)}` : formatNumber(exercise.reps_min, locale) })}</p>
        {(exercise.superset_group === null || day.exercises.filter(row => row.superset_group === exercise.superset_group).length < 2) &&
          <p className="text-sm text-muted">{t('rest', { n: exercise.rest_seconds, count: formatNumber(exercise.rest_seconds, locale) })}</p>}
        {program.settings.advanced && <p className="text-sm text-muted">
          {exercise.rpe !== null && t('rpe', { n: formatNumber(exercise.rpe, locale) })}{exercise.tempo && t('tempo', { tempo: exercise.tempo })}
        </p>}
        {exercise.notes && <p className="text-sm text-muted">{exercise.notes}</p>}
      </li>)}</ul>
    </section>)}
  </section>;
}

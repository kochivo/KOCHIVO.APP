'use client';

import { secondaryButtonClass } from '@/ui/secondary-button-class';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ExerciseVideo } from '@/features/workout';
import { useT } from '@/core/i18n/client';
import { exerciseMediaUrl } from '@/core/storage';
import type { LibraryExercise } from '@/features/programs';
import { ExerciseImage } from '@/ui/exercise-image';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { LoadingState } from '@/ui/loading-state';
import { KoPlus } from '@/ui/icons/ko-plus';
import { exerciseDetailMessages, messages as workspaceMessages } from '../messages';

import { exerciseLabel } from '../exercise-label';
import { exerciseTitle } from './exercise-card';
import { messages } from './messages';
import { Button, buttonClass } from '@/ui/button';

const AddToProgram = dynamic(() => import('./exercise-program-picker').then(module => module.ExerciseProgramPicker), {
  loading: () => <LoadingState variant="detail" />,
});

export function ExerciseDetail({ exercise, onClose }: { exercise: LibraryExercise; onClose: () => void }) {
  const t = useT(messages);
  const detail = useT(exerciseDetailMessages);
  const workspace = useT(workspaceMessages);
  const [adding, setAdding] = useState(false);
  const instructions = exercise.instructions_ar?.some(step => step.trim())
    ? exercise.instructions_ar.filter(step => step.trim()) : exercise.instructions_en?.filter(step => step.trim()) ?? [];
  const video = exercise.video_url?.startsWith('https://') ? exercise.video_url : null;
  return <ResponsiveDialog modal fallbackId="new-library-exercise" onDismiss={onClose} aria-label={exerciseTitle(exercise)}
    className="sheet fixed inset-0 z-50 m-auto h-full max-h-dvh w-full overflow-y-auto p-card text-ink backdrop:bg-bg-deep/80 min-[760px]:max-h-[90dvh] min-[760px]:w-[calc(100%-3rem)] min-[760px]:max-w-5xl min-[760px]:rounded-card min-[760px]:p-card">
    <header className="glass mb-card-gap flex flex-wrap items-center gap-stack rounded-card border border-line-soft p-stack">
      <button type="button" onClick={onClose} aria-label={detail('back')} className={`${secondaryButtonClass} grid min-h-12 min-w-12 place-items-center rounded-full`}><ArrowRight aria-hidden className="size-4 rtl:rotate-0 ltr:rotate-180" /></button>
      <div><h2 className="text-md font-semibold"><bdi>{exerciseTitle(exercise)}</bdi></h2>
        <p dir="ltr" className="text-start text-xs text-muted">{exercise.name_en}</p></div>
      <Button type="button" onClick={() => setAdding(true)} variant={'secondary'} block={false} className={"ms-auto inline-flex min-h-12 items-center gap-inline px-page-x text-sm"}><KoPlus aria-hidden className="size-4" />{detail('add')}</Button>
    </header>
    <div className="grid items-start gap-stack min-[760px]:grid-cols-2">
      <div className="glass space-y-stack rounded-card border border-line-soft p-card">
        {exercise.media_path ? <ExerciseImage src={exerciseMediaUrl(exercise.media_path)} alt="" width={480} height={480} fullWidth className="bg-exercise-media" /> :
          <p className="glass-strong flex aspect-square items-center justify-center rounded-card p-card text-muted">{t('noMedia')}</p>}
        {video && <ExerciseVideo url={video} name={exerciseTitle(exercise)} />}
      </div>
      <div className="space-y-stack">
        <section className="glass rounded-card border border-line-soft p-card">
        <h3 className="mb-stack text-sm font-semibold">{detail('muscles')}</h3>
        <dl className="divide-y divide-line-soft text-xs [&>div]:flex [&>div]:justify-between [&>div]:gap-stack [&>div]:py-inline [&_dd]:text-end [&_dd]:font-semibold [&_dt]:text-muted">
          <div><dt>{detail('primary')}</dt><dd>{exerciseLabel(exercise.body_part, workspace)}{exercise.target && <> ({exerciseLabel(exercise.target, workspace)})</>}</dd></div>
          <div><dt>{detail('secondary')}</dt><dd>{exercise.secondary_muscles?.length ?
            <ul className="flex flex-wrap gap-inline">{exercise.secondary_muscles.map((muscle, index) => <li key={index} className="rounded-full bg-surface-raised px-inline py-inline text-sm">{exerciseLabel(muscle, workspace)}</li>)}</ul> : t('missing')}</dd></div>
          <div><dt>{detail('tool')}</dt><dd>{exerciseLabel(exercise.equipment, workspace)}</dd></div>
        </dl></section>
        <section className="glass rounded-card border border-line-soft p-card">
          <div className="flex items-center justify-between gap-stack"><h3 className="text-sm font-semibold">{t('instructions')}</h3>
            {exercise.is_own && <Link href={`/captain/library/exercises/${exercise.id}/edit`} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x" })}>{t('edit')}</Link>}</div>
          {instructions.length ? <ol className="list-decimal ps-card text-row leading-loose text-muted">{instructions.map((step, index) => <li key={index}>{step}</li>)}</ol> :
            <p className="text-sm text-muted">{t('missing')}</p>}
        </section>
      </div>
    </div>
    {adding && <AddToProgram exercise={exercise} onClose={() => setAdding(false)} />}
  </ResponsiveDialog>;
}

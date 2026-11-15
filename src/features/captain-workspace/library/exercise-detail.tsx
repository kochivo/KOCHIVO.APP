'use client';

import { secondaryButtonClass } from '@/ui/secondary-button-class';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ArrowRight, Link as LinkIcon } from 'lucide-react';
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
    className="sheet fixed inset-0 z-50 m-auto h-full max-h-dvh w-full overflow-y-auto p-4 text-ink backdrop:bg-bg-deep/80 min-[760px]:max-h-[90dvh] min-[760px]:w-[calc(100%-3rem)] min-[760px]:max-w-5xl min-[760px]:rounded-card min-[760px]:p-5">
    <header className="glass mb-3.5 flex flex-wrap items-center gap-3 rounded-card border border-line-soft p-3">
      <button type="button" onClick={onClose} aria-label={detail('back')} className={`${secondaryButtonClass} grid min-h-12 min-w-12 place-items-center rounded-full`}><ArrowRight aria-hidden className="size-4 rtl:rotate-0 ltr:rotate-180" /></button>
      <div><h2 className="text-[15px] font-semibold"><bdi>{exerciseTitle(exercise)}</bdi></h2>
        <p dir="ltr" className="text-start text-xs text-muted">{exercise.name_en}</p></div>
      <Button type="button" onClick={() => setAdding(true)} variant={'secondary'} block={false} className={"ms-auto inline-flex min-h-12 items-center gap-2 px-4 text-sm"}><KoPlus aria-hidden className="size-4" />{detail('add')}</Button>
    </header>
    <div className="grid items-start gap-3 min-[760px]:grid-cols-2">
      <div className="glass space-y-3 rounded-card border border-line-soft p-3.5">
        {exercise.media_path ? <ExerciseImage src={exerciseMediaUrl(exercise.media_path)} alt="" width={480} height={480} fullWidth className="bg-exercise-media" /> :
          <p className="glass-strong flex aspect-square items-center justify-center rounded-card p-5 text-muted">{t('noMedia')}</p>}
        {video && <a href={video} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center gap-2 px-4 text-sm" })}><LinkIcon aria-hidden className="size-4" />{detail('video')}</a>}
      </div>
      <div className="space-y-3">
        <section className="glass rounded-card border border-line-soft p-3.5">
        <h3 className="mb-2.5 text-sm font-semibold">{detail('muscles')}</h3>
        <dl className="divide-y divide-line-soft text-xs [&>div]:flex [&>div]:justify-between [&>div]:gap-3 [&>div]:py-2 [&_dd]:text-end [&_dd]:font-semibold [&_dt]:text-muted">
          <div><dt>{detail('primary')}</dt><dd>{exerciseLabel(exercise.body_part, workspace)}{exercise.target && <> ({exerciseLabel(exercise.target, workspace)})</>}</dd></div>
          <div><dt>{detail('secondary')}</dt><dd>{exercise.secondary_muscles?.length ?
            <ul className="flex flex-wrap gap-2">{exercise.secondary_muscles.map((muscle, index) => <li key={index} className="rounded-full bg-surface-raised px-2 py-1 text-sm">{exerciseLabel(muscle, workspace)}</li>)}</ul> : t('missing')}</dd></div>
          <div><dt>{detail('tool')}</dt><dd>{exerciseLabel(exercise.equipment, workspace)}</dd></div>
        </dl></section>
        <section className="glass rounded-card border border-line-soft p-3.5">
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{t('instructions')}</h3>
            {exercise.is_own && <Link href={`/captain/library/exercises/${exercise.id}/edit`} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-4" })}>{t('edit')}</Link>}</div>
          {instructions.length ? <ol className="list-decimal ps-5 text-[13px] leading-loose text-muted">{instructions.map((step, index) => <li key={index}>{step}</li>)}</ol> :
            <p className="text-sm text-muted">{t('missing')}</p>}
        </section>
      </div>
    </div>
    {adding && <AddToProgram exercise={exercise} onClose={() => setAdding(false)} />}
  </ResponsiveDialog>;
}

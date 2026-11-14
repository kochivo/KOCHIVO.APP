'use client';

import Link from 'next/link';
import { useT } from '@/core/i18n/client';
import { exerciseMediaUrl } from '@/core/storage';
import type { LibraryExercise } from '@/features/programs';
import { ExerciseImage } from '@/ui/exercise-image';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { exerciseTitle } from './exercise-card';
import { messages } from './messages';

export function ExerciseDetail({ exercise, onClose }: { exercise: LibraryExercise; onClose: () => void }) {
  const t = useT(messages);
  const instructions = exercise.instructions_ar?.some(step => step.trim())
    ? exercise.instructions_ar.filter(step => step.trim()) : exercise.instructions_en ?? [];
  const video = exercise.video_url?.startsWith('https://') ? exercise.video_url : null;
  return <ResponsiveDialog modal fallbackId="new-library-exercise" onDismiss={onClose} aria-label={exerciseTitle(exercise)}
    className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
    <header className="mb-5 flex items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold"><bdi>{exerciseTitle(exercise)}</bdi></h2>
        <p dir="ltr" className="text-start text-sm text-muted">{exercise.name_en}</p></div>
      <button type="button" onClick={onClose} className="min-h-12 rounded-full border border-line px-4">{t('close')}</button>
    </header>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-3">
        {exercise.media_path ? <ExerciseImage src={exerciseMediaUrl(exercise.media_path)} alt="" width={480} height={480} fullWidth className="bg-exercise-media" /> :
          <p className="glass-strong flex aspect-square items-center justify-center rounded-card p-5 text-muted">{t('noMedia')}</p>}
        {video && <a href={video} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full border border-line px-4">{t('video')}</a>}
      </div>
      <div className="space-y-5">
        <dl className="glass-strong space-y-3 rounded-card p-5">
          <div><dt className="text-sm text-muted">{t('target')}</dt><dd>{exercise.target || exercise.body_part || t('missing')}</dd></div>
          <div><dt className="text-sm text-muted">{t('secondary')}</dt><dd>{exercise.secondary_muscles?.length ?
            <ul className="flex flex-wrap gap-2">{exercise.secondary_muscles.map((muscle, index) => <li key={index} className="rounded-full bg-surface-raised px-2 py-1 text-sm">{muscle}</li>)}</ul> : t('missing')}</dd></div>
          <div><dt className="text-sm text-muted">{t('equipment')}</dt><dd>{exercise.equipment || t('missing')}</dd></div>
        </dl>
        <section className="glass rounded-card p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{t('instructions')}</h3>
            {exercise.is_own && <Link href={`/captain/library/exercises/${exercise.id}/edit`} className="inline-flex min-h-12 items-center rounded-full border border-line px-4">{t('edit')}</Link>}</div>
          {instructions.length ? <ol className="list-decimal space-y-3 ps-5 text-sm leading-relaxed">{instructions.map((step, index) => <li key={index}>{step}</li>)}</ol> :
            <p className="text-sm text-muted">{t('missing')}</p>}
        </section>
      </div>
    </div>
  </ResponsiveDialog>;
}

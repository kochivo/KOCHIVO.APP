'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { Medal } from '@/ui/medal';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { earnedCount, medalProgress } from '../medals';
import type { MedalCounts } from '../medals';
import { messages } from '../messages';

export function MedalSets({ counts }: { counts: MedalCounts }) {
  const t = useT(messages);
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const sets = medalProgress(counts);
  const preview = [...sets.flatMap(set => set.earned.map(step => ({ set, step }))),
    ...sets.flatMap(set => set.next ? [{ set, step: set.next }] : [])];
  return <>
    <Button id="medal-sets" variant="secondary" className="w-full flex-col p-card text-start" onClick={() => setOpen(true)}>
      <span className="flex w-full items-center gap-inline"><b className="flex-1">{t('otherMedals')}</b>
        <span className="text-xs text-muted">{t('medalCount', { n: formatNumber(earnedCount(counts), locale) })}</span><ChevronLeft className="dir-icon size-4" aria-hidden /></span>
      <span className="mt-stack grid w-full grid-cols-3 gap-inline">{preview.map(({ set, step }) =>
        <span key={step.id} className="flex flex-col items-center gap-inline rounded-control border border-line bg-surface p-inline text-center text-xs">
          <Medal rank={step.metal} emblem={set.emblem} size={48} locked={!step.earned} label={t(set.key === 'workouts' ? 'workoutSet' : set.key)} />
          <span>{step.streak ? t('streakStep') : formatNumber(step.threshold, locale)} · {t(set.key === 'workouts' ? 'workoutSet' : set.key)}</span>
          <span className={step.earned ? 'text-muted' : 'text-lime'}>{step.earned ? t('earned') : t('percent', { n: formatNumber(step.percent, locale) })}</span>
        </span>)}</span>
    </Button>
    {open && <ResponsiveDialog modal title={t('otherMedals')} fallbackId="medal-sets" onDismiss={() => setOpen(false)}
      className="sheet fixed start-0 end-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-card border border-line p-card text-ink backdrop:bg-bg-deep/80 min-[760px]:inset-0 min-[760px]:m-auto min-[760px]:rounded-card">
      <div className="space-y-section">{sets.map(set => <section key={set.key} className="space-y-stack">
        <h3 className="font-bold">{t(set.key === 'workouts' ? 'workoutSet' : set.key)}</h3>
        <ol className="grid grid-cols-5 gap-inline">{set.steps.map(step => <li key={step.id} className="flex flex-col items-center gap-inline text-center text-xs">
          <Medal rank={step.metal} emblem={set.emblem} size={48} locked={!step.earned} label={t(set.key === 'workouts' ? 'workoutSet' : set.key)} />
          <span>{step.streak ? t('streakStep') : formatNumber(step.threshold, locale)}</span>
          <span className={step.earned ? 'text-muted' : 'text-lime'}>{step.earned ? t('earned') : t('percent', { n: formatNumber(step.percent, locale) })}</span>
        </li>)}</ol>
      </section>)}</div>
    </ResponsiveDialog>}
  </>;
}

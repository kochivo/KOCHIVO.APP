'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseMediaUrl } from '@/core/storage';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { ExerciseImage } from '@/ui/exercise-image';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { GeneratedExercise as Exercise } from '../generate';
import { messages } from '../messages';
import { dismissNested } from './swap-sheet';

export function GeneratedExercise({ row, onSwap }: { row: Exercise; onSwap: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const [details, setDetails] = useState(false);
  const name = (row.library && exerciseName(row.library, locale)) || t('unavailable');
  const n = (value: number) => formatNumber(value, locale);
  const summary = t('prescription', { sets: n(row.sets), min: n(row.reps_min), max: n(row.reps_max ?? row.reps_min), rest: n(row.rest_seconds) });
  const reasons = row.reasons.filter(reason => reason === 'captain_favorite' || reason.startsWith('injury_safe_') || reason.startsWith('replaced_for_')).slice(0, 2);
  return <article className="glass flex items-center gap-3 rounded-control p-3">
    {captainWorkspaceEnabled() ? <Button variant="secondary" type="button" className="min-h-12 flex-1 flex-col items-start! space-y-2 text-start" aria-haspopup="dialog" onClick={() => setDetails(true)}>
      <span className="block font-bold"><bdi>{name}</bdi></span>
      <span className="block text-sm tabular-nums text-muted">{summary}</span>
      {reasons.length > 0 && <span className="flex flex-wrap gap-2">{reasons.map(reason =>
        <span key={reason} className="glass-strong rounded-chip px-3 py-1 text-xs">{t(reason)}</span>)}</span>}
    </Button> : <button type="button" className="min-h-12 flex-1 space-y-2 text-start" aria-haspopup="dialog" onClick={() => setDetails(true)}>
      <span className="block font-bold"><bdi>{name}</bdi></span>
      <span className="block text-sm tabular-nums text-muted">{summary}</span>
      {reasons.length > 0 && <span className="flex flex-wrap gap-2">{reasons.map(reason =>
        <span key={reason} className="glass-strong rounded-chip px-3 py-1 text-xs">{t(reason)}</span>)}</span>}
    </button>}
    <Button variant="secondary" className="min-h-12 min-w-12" aria-label={t('swap')} onClick={onSwap}>
      <ArrowLeftRight aria-hidden className="size-5" />
    </Button>
    {details && <ResponsiveDialog modal fallbackId="generator-heading" onDismiss={() => setDetails(false)} aria-label={t('details')}
      onKeyDownCapture={event => dismissNested(event, () => setDetails(false))}
      className="sheet fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg space-y-4 overflow-y-auto rounded-card border border-line bg-surface p-6 text-ink">
      <h3 className="font-bold"><bdi>{name}</bdi></h3>
      {row.library?.media_path ? <ExerciseImage src={exerciseMediaUrl(row.library.media_path)} alt={name} width={480} height={480} fullWidth /> : <p>{t('noMedia')}</p>}
      <p>{summary}</p>
      <Button variant="secondary" className="min-h-12" onClick={() => setDetails(false)}>{t('close')}</Button>
    </ResponsiveDialog>}
  </article>;
}

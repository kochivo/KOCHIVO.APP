'use client';

import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, Chip, Stepper } from '@/ui';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../messages';
import type { DraftExercise, ExercisePatch } from '../types';
import { clampReps, repsMode } from './builder-fields';

export function RepsSheet({ row, openerId, onClose, onUpdate }: {
  row: DraftExercise; openerId: string; onClose: () => void; onUpdate: (patch: ExercisePatch) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [mode, setMode] = useState(() => repsMode(row));
  const format = (value: number) => formatNumber(value, locale);
  const change = (minimum: number, maximum: number) => onUpdate(clampReps(mode, minimum, maximum));
  return <ResponsiveDialog modal fallbackId={openerId} openerId={openerId} onDismiss={onClose}
    aria-label={t('reps')} dir={locale === 'ar' ? 'rtl' : 'ltr'}
    className="glass-strong fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-md space-y-4 rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
    <div className="flex items-center justify-between gap-3"><h2>{t('reps')}</h2>
      <Button variant="secondary" onClick={onClose}>{t('closeEditor')}</Button></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('reps')}>
      {(['fixed', 'range', 'failure'] as const).map(value => <Chip key={value} pressed={mode === value}
        onClick={() => { setMode(value); onUpdate(clampReps(value, row.reps_min, row.reps_max ?? row.reps_min)); }}>{t(value)}</Chip>)}
    </div>
    {mode === 'failure' ? <p className="text-muted">{t('failure')}</p> : <div className="space-y-3">
      <Stepper label={t(mode === 'fixed' ? 'reps' : 'from')} value={row.reps_min} min={1} max={100} step={1} format={format}
        onChange={value => change(value, row.reps_max ?? value)} />
      {mode === 'range' && <Stepper label={t('upTo')} value={row.reps_max ?? row.reps_min} min={row.reps_min} max={100} step={1} format={format}
        onChange={value => change(row.reps_min, value)} />}
    </div>}
  </ResponsiveDialog>;
}

'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { IconButton, Stepper } from '@/ui';
import type { DraftExercise, ExercisePatch } from '../types';

export function ExerciseRow({ row, first, last, selected, onSelect, onMove, onDelete, onUpdate }: {
  row: DraftExercise; first: boolean; last: boolean; selected: boolean;
  onSelect: () => void; onMove: (delta: -1 | 1) => void; onDelete: () => void;
  onUpdate: (patch: ExercisePatch) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const name = (row.library && exerciseName(row.library, locale)) || t('exerciseUnavailable');
  return <article className="glass space-y-4 rounded-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="break-words font-bold"><bdi>{name}</bdi></h3>
        {row.superset_group !== null && <p className="text-sm text-lime">{t('superset')} {formatNumber(row.superset_group, locale)}</p>}
      </div>
      <div className="flex gap-2">
        <IconButton aria-label={t('moveUp', { v0: name, v1: formatNumber(row.position, locale) })} disabled={first} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="dir-icon size-5" /></IconButton>
        <IconButton aria-label={t('moveDown', { v0: name, v1: formatNumber(row.position, locale) })} disabled={last} onClick={() => onMove(1)}><ArrowDown aria-hidden className="dir-icon size-5" /></IconButton>
        <IconButton aria-label={t('deleteExercise', { v0: name, v1: formatNumber(row.position, locale) })} onClick={onDelete}><Trash2 aria-hidden className="size-5" /></IconButton>
      </div>
    </div>
    <div className="grid gap-3 xl:grid-cols-3">
      <Stepper label={t('sets')} controlLabel={t('sets2', { v0: name, v1: formatNumber(row.position, locale) })} format={value => formatNumber(value, locale)} value={row.sets} min={1} step={1} onChange={sets => onUpdate({ sets })} />
      <Stepper label={t('minReps')} controlLabel={t('minReps2', { v0: name, v1: formatNumber(row.position, locale) })} format={value => formatNumber(value, locale)} value={row.reps_min} min={1} step={1} onChange={reps_min => onUpdate({ reps_min })} />
      {row.reps_max !== null && <Stepper label={t('maxReps')} controlLabel={t('maxReps2', { v0: name, v1: formatNumber(row.position, locale) })} format={value => formatNumber(value, locale)} value={row.reps_max} min={row.reps_min} step={1} onChange={reps_max => onUpdate({ reps_max })} />}
    </div>
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex min-h-12 items-center gap-2 text-sm">
        <input type="checkbox" className="size-6 accent-lime" checked={row.reps_max === null}
          onChange={event => onUpdate({ reps_max: event.target.checked ? null : row.reps_min })} />{t('openReps')} </label>
      <label className="flex min-h-12 items-center gap-2 text-sm">{t('rest')} <select className="min-h-12 rounded-control border border-line bg-surface px-3" value={row.rest_seconds}
          onChange={event => onUpdate({ rest_seconds: Number(event.target.value) })}>
          {Array.from({ length: 61 }, (_, i) => i * 15).map(value => <option key={value} value={value}>{t('secondCount', { n: value, count: formatNumber(value, locale) })}</option>)}
        </select>
      </label>
      <label className="flex min-h-12 items-center gap-2 text-sm">
        <input type="checkbox" className="size-6 accent-lime" checked={selected} onChange={onSelect} />{t('selectForSuperset')} </label>
    </div>
  </article>;
}

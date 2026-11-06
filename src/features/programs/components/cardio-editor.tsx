'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { IconButton, Stepper, TextField } from '@/ui';
import { messages } from '../messages';
import type { CardioRow } from '../types';

export function CardioEditor({ row, first, last, onChange, onMove, onDelete }: {
  row: CardioRow; first: boolean; last: boolean; onChange: (row: CardioRow) => void;
  onMove: (delta: -1 | 1) => void; onDelete: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const label = { v0: row.kind, v1: formatNumber(row.position, locale) };
  const listId = `cardio-kinds-${row.id}`;
  return <article className="glass space-y-4 rounded-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold">{t('cardio')}</h3>
      <div className="flex gap-2">
        <IconButton aria-label={t('moveUp', label)} disabled={first} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="size-5" /></IconButton>
        <IconButton aria-label={t('moveDown', label)} disabled={last} onClick={() => onMove(1)}><ArrowDown aria-hidden className="size-5" /></IconButton>
        <IconButton aria-label={t('deleteCardio', label)} onClick={onDelete}><Trash2 aria-hidden className="size-5" /></IconButton>
      </div>
    </div>
    <TextField label={t('cardioKind')} value={row.kind} maxLength={40} list={listId}
      onChange={event => onChange({ ...row, kind: event.target.value })} />
    <datalist id={listId}>{(['walk', 'run', 'bike', 'elliptical', 'rope', 'treadmill', 'stairmaster'] as const).map(key => <option key={key} value={t(key)} />)}</datalist>
    <Stepper label={t('cardioMinutes')} value={row.minutes} min={1} step={1}
      format={value => formatNumber(value, locale)} onChange={minutes => onChange({ ...row, minutes: Math.min(300, minutes) })} />
    <fieldset className="space-y-2">
      <legend>{t('cardioIntensity')}</legend>
      <div className="glass grid grid-cols-3 gap-2 rounded-control p-1">{(['low', 'moderate', 'high'] as const).map(intensity =>
        <label key={intensity} className={`flex min-h-12 items-center justify-center gap-2 rounded-control ${row.intensity === intensity ? 'glass-strong' : ''}`}>
          <input type="radio" name={`intensity-${row.id}`} value={intensity} checked={row.intensity === intensity}
            onChange={() => onChange({ ...row, intensity })} className="accent-lime" />{t(intensity)}
        </label>)}</div>
    </fieldset>
    <TextField label={t('cardioNotes')} value={row.notes} maxLength={300}
      onChange={event => onChange({ ...row, notes: event.target.value })} />
  </article>;
}

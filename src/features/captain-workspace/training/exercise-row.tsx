'use client';

import { ChevronDown, ChevronUp, GripVertical, Minus, Plus, X } from 'lucide-react';
import type { CSSProperties, ButtonHTMLAttributes } from 'react';
import { useT } from '@/core/i18n/client';
import type { DraftExercise } from '@/features/programs';
import { exerciseLabel } from '../exercise-label';
import { messages as workspaceMessages } from '../messages';
import { messages } from './messages';

type Patch = { sets?: number; reps_min?: number; reps_max?: number; rest_seconds?: number };
export function TrainingExerciseRow({ row, onPatch, onRemove, onMove, dragProps, style }: {
  row: DraftExercise; onPatch: (patch: Patch) => void; onRemove: () => void; onMove: (delta: -1 | 1) => void;
  dragProps: ButtonHTMLAttributes<HTMLButtonElement>; style?: CSSProperties;
}) {
  const t = useT(messages), wt = useT(workspaceMessages);
  const name = row.library?.name_en || row.library?.name_ar || wt('exerciseUnavailable');
  const input = 'min-h-12 w-10 bg-transparent text-center font-display font-extrabold tabular-nums';
  return <li style={style} className="group grid min-h-16 grid-cols-[minmax(0,1fr)_auto_48px] items-center gap-2 border-t border-line-soft px-4 py-3 first:border-0 min-[761px]:@min-[600px]:grid-cols-[28px_minmax(0,1fr)_auto_auto_auto_48px] min-[761px]:@min-[600px]:gap-3">
    <button {...dragProps} aria-label={t('reorder', { name })} className="hidden min-h-12 touch-none cursor-grab items-center justify-center text-faint min-[761px]:@min-[600px]:flex"
      onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onMove(event.key === 'ArrowUp' ? -1 : 1); } }}>
      <GripVertical aria-hidden className="size-5" />
    </button>
    <div className="min-h-12 min-w-0" tabIndex={0} aria-label={t('reorder', { name })} onKeyDown={event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onMove(event.key === 'ArrowUp' ? -1 : 1); }
    }}><bdi className="block break-words text-sm">{name}</bdi>
      <small className="block text-[11.5px] text-faint">{exerciseLabel(row.library?.body_part, wt)} · {exerciseLabel(row.library?.equipment, wt)}</small>
      <div className="hidden group-focus-within:flex min-[761px]:@min-[600px]:hidden!">
        <button aria-label={t('moveUp', { name })} className="grid min-h-12 min-w-12 place-items-center text-muted" onClick={() => onMove(-1)}><ChevronUp aria-hidden className="size-4" /></button>
        <button aria-label={t('moveDown', { name })} className="grid min-h-12 min-w-12 place-items-center text-muted" onClick={() => onMove(1)}><ChevronDown aria-hidden className="size-4" /></button>
      </div>
    </div>
    <div role="group" aria-label={t('sets', { name })} className="inline-flex items-center overflow-hidden rounded-full border border-line">
      <button disabled={row.sets <= 1} aria-label={t('fewer', { name })} onClick={() => onPatch({ sets: row.sets - 1 })} className="grid min-h-12 min-w-12 place-items-center text-muted disabled:opacity-30"><Minus aria-hidden className="size-3" /></button>
      <span className="min-w-6 text-center font-display font-extrabold tabular-nums">{row.sets}</span>
      <button disabled={row.sets >= 20} aria-label={t('more', { name })} onClick={() => onPatch({ sets: row.sets + 1 })} className="grid min-h-12 min-w-12 place-items-center text-muted disabled:opacity-30"><Plus aria-hidden className="size-3" /></button>
    </div>
    <div dir="ltr" className="hidden items-center min-[761px]:@min-[600px]:flex">
      <input type="number" aria-label={t('repsMin', { name })} min={1} max={100} value={row.reps_min} className={input} onChange={event => onPatch({ reps_min: Number(event.target.value) })} />
      <span aria-hidden>–</span>
      {row.reps_max === null ? <span className="text-xs">{wt('failure')}</span> : <input type="number" aria-label={t('repsMax', { name })} min={row.reps_min} max={32767} value={row.reps_max} className={input} onChange={event => onPatch({ reps_max: Number(event.target.value) })} />}
    </div>
    <label className="relative hidden items-center text-xs text-faint min-[761px]:@min-[600px]:flex">
      <span>{t('rest', { n: row.rest_seconds })}</span>
      <input type="number" aria-label={t('restLabel', { name })} min={0} max={900} step={15} value={row.rest_seconds}
        className="absolute inset-0 min-h-12 w-full cursor-text bg-surface text-center opacity-0 focus:opacity-100" onChange={event => onPatch({ rest_seconds: Number(event.target.value) })} />
    </label>
    <button aria-label={t('remove', { name })} onClick={onRemove} className="grid min-h-12 min-w-12 place-items-center text-faint"><X aria-hidden className="size-4" /></button>
  </li>;
}

'use client';
import { NumberInput } from '@/ui/number-input';
import { editableFieldClass } from '@/ui/edit-in-place';
import { GripVertical, X, ArrowUp, ArrowDown } from 'lucide-react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import type { WarmupItem } from '@/features/programs';
import { useT } from '@/core/i18n/client';
import { messages } from './editor/messages';
import { IconButton } from '@/ui/icon-button';

export function WarmupRow({ item, onChange, onRemove, onMove, dragProps, style }: {
  item: WarmupItem; onChange: (next: WarmupItem) => void; onRemove: () => void; onMove: (delta: -1 | 1) => void;
  dragProps: ButtonHTMLAttributes<HTMLButtonElement>; style?: CSSProperties;
}) {
  const t = useT(messages);
  return <li style={style} className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-start gap-inline border-t border-line-soft px-page-x py-stack min-[760px]:grid-cols-[48px_minmax(0,1fr)_120px_48px]">
    <IconButton {...dragProps} aria-label={`${t('up')} · ${item.name}`} className="size-12 touch-none text-muted"
      onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onMove(event.key === 'ArrowUp' ? -1 : 1); } }}><GripVertical aria-hidden className="size-4" /></IconButton>
    <div className="min-w-0">
      <input aria-label={t('warmName')} defaultValue={item.name} maxLength={60} className={`${editableFieldClass} min-h-12 w-full bg-surface text-sm`}
        onBlur={event => { const name = event.target.value.trim(); if (name) onChange({ ...item, name }); else event.target.value = item.name; }} />
      <input aria-label={t('warmNote')} placeholder={t('warmNote')} value={item.note ?? ''} maxLength={80} className={`${editableFieldClass} min-h-12 w-full bg-surface text-xs text-faint`} onChange={event => onChange({ ...item, note: event.target.value })} />
    </div>
    <div className="col-span-full row-start-2 flex min-w-0 flex-wrap items-center gap-inline min-[760px]:col-span-1 min-[760px]:col-start-3 min-[760px]:row-start-1">
    <div className="flex min-w-0 flex-1 items-center rounded-control border border-line-soft">
      <NumberInput aria-label={t('amount')} value={item.amount} min={1} max={999} dir="ltr" className={`${editableFieldClass} min-h-12 w-12 min-w-0 bg-surface text-center font-display font-extrabold`} onCommit={value => onChange({ ...item, amount: Math.max(1, Math.min(999, Math.round(value || 1))) })} />
      <select aria-label={t('unit')} value={item.unit} className={`${editableFieldClass} min-h-12 min-w-0 flex-1 bg-surface text-xs`} onChange={event => onChange({ ...item, unit: event.target.value as WarmupItem['unit'] })}>
        {(['min', 'sec', 'reps', 'times'] as const).map(unit => <option key={unit} value={unit}>{t(unit)}</option>)}
      </select>
    </div>
      <div className="flex gap-inline min-[760px]:hidden"><IconButton aria-label={`${t('up')} · ${item.name}`} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="size-4" /></IconButton>
        <IconButton aria-label={`${t('down')} · ${item.name}`} onClick={() => onMove(1)}><ArrowDown aria-hidden className="size-4" /></IconButton></div>
    </div>
    <IconButton aria-label={`${t('remove')} · ${item.name}`} className="col-start-3 row-start-1 text-muted min-[760px]:col-start-4" onClick={onRemove}><X aria-hidden className="size-4" /></IconButton>
  </li>;
}

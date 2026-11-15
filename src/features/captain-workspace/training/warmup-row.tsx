'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { GripVertical, X, ArrowUp, ArrowDown } from 'lucide-react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import type { WarmupItem } from '@/features/programs';
import { useT } from '@/core/i18n/client';
import { messages } from './editor/messages';
import { Button } from '@/ui/button';

export function WarmupRow({ item, onChange, onRemove, onMove, dragProps, style }: {
  item: WarmupItem; onChange: (next: WarmupItem) => void; onRemove: () => void; onMove: (delta: -1 | 1) => void;
  dragProps: ButtonHTMLAttributes<HTMLButtonElement>; style?: CSSProperties;
}) {
  const t = useT(messages);
  return <li style={style} className="grid grid-cols-[minmax(0,1fr)_100px_48px] items-center gap-2 border-t border-line-soft px-[18px] py-2.5 min-[761px]:grid-cols-[48px_minmax(0,1fr)_120px_48px]">
    <Button {...dragProps} aria-label={`${t('up')} · ${item.name}`} type="submit" variant={'secondary'} block={false} className={"hidden min-h-12 min-w-12 touch-none items-center justify-center text-muted min-[761px]:flex"}
      onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onMove(event.key === 'ArrowUp' ? -1 : 1); } }}><GripVertical aria-hidden className="size-4" /></Button>
    <div className="min-w-0">
      <input aria-label={t('warmName')} defaultValue={item.name} maxLength={60} className={`${editableFieldClass} min-h-12 w-full bg-surface text-sm`}
        onBlur={event => { const name = event.target.value.trim(); if (name) onChange({ ...item, name }); else event.target.value = item.name; }} />
      <input aria-label={t('warmNote')} placeholder={t('warmNote')} value={item.note ?? ''} maxLength={80} className={`${editableFieldClass} min-h-12 w-full bg-surface text-xs text-faint`} onChange={event => onChange({ ...item, note: event.target.value })} />
      <div className="flex gap-2 min-[761px]:hidden"><Button type="submit" variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center"} aria-label={`${t('up')} · ${item.name}`} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="size-4" /></Button>
        <Button type="submit" variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center"} aria-label={`${t('down')} · ${item.name}`} onClick={() => onMove(1)}><ArrowDown aria-hidden className="size-4" /></Button></div>
    </div>
    <div className="flex min-w-0 items-center rounded-full border border-line-soft">
      <input type="number" aria-label={t('amount')} value={item.amount} min={1} max={999} dir="ltr" className={`${editableFieldClass} min-h-12 w-12 min-w-0 bg-surface text-center font-display font-extrabold`} onChange={event => onChange({ ...item, amount: Math.max(1, Math.min(999, Math.round(Number(event.target.value) || 1))) })} />
      <select aria-label={t('unit')} value={item.unit} className={`${editableFieldClass} min-h-12 min-w-0 flex-1 bg-surface text-xs`} onChange={event => onChange({ ...item, unit: event.target.value as WarmupItem['unit'] })}>
        {(['min', 'sec', 'reps', 'times'] as const).map(unit => <option key={unit} value={unit}>{t(unit)}</option>)}
      </select>
    </div>
    <Button aria-label={`${t('remove')} · ${item.name}`} type="submit" variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center text-muted"} onClick={onRemove}><X aria-hidden className="size-4" /></Button>
  </li>;
}

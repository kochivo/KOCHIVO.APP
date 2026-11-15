'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Stepper } from '@/ui/stepper';
import type { DraftDay } from '@/features/programs';
import { messages } from './editor/messages';
import { Button } from '@/ui/button';

type Row = NonNullable<DraftDay['cardio']>[number];
export function CardioRow({ row, first, last, onChange, onMove, onRemove }: { row: Row; first: boolean; last: boolean; onChange: (row: Row) => void; onMove: (delta: -1 | 1) => void; onRemove: () => void }) {
  const t = useT(messages);
  return <article className="glass space-y-stack rounded-card border border-line-soft p-card">
    <div className="flex justify-end gap-inline">{([{ key: 'up', icon: ArrowUp, disabled: first, click: () => onMove(-1) }, { key: 'down', icon: ArrowDown, disabled: last, click: () => onMove(1) }, { key: 'remove', icon: Trash2, disabled: false, click: onRemove }] as const).map(action =>
      <Button key={action.key} aria-label={`${t(action.key)} · ${row.kind}`} disabled={action.disabled} onClick={action.click} type="submit" variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center disabled:opacity-30"}><action.icon aria-hidden className="size-5" /></Button>)}</div>
    <label className="block text-xs text-faint">{t('cardioKind')}<input value={row.kind} maxLength={40} className={`${editableFieldClass} block min-h-12 w-full bg-surface text-sm text-ink`} onChange={event => onChange({ ...row, kind: event.target.value })} /></label>
    <Stepper size="compact" label={t('cardioMinutes')} value={row.minutes} min={1} max={300} step={1} onChange={minutes => onChange({ ...row, minutes })} />
    <label className="block text-xs text-faint">{t('cardioIntensity')}<select value={row.intensity} className={`${editableFieldClass} block min-h-12 w-full bg-surface text-ink`} onChange={event => onChange({ ...row, intensity: event.target.value as Row['intensity'] })}>{(['low', 'moderate', 'high'] as const).map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>
    <label className="block text-xs text-faint">{t('cardioNotes')}<input value={row.notes} maxLength={300} className={`${editableFieldClass} block min-h-12 w-full bg-surface text-sm text-ink`} onChange={event => onChange({ ...row, notes: event.target.value })} /></label>
  </article>;
}

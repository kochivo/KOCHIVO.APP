'use client';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import type { DraftDay } from '@/features/programs';
import { editDay } from './editor-draft';
import type { Update } from './editor-draft';
import { messages } from './editor/messages';
import { CardioRow } from './cardio-row';
import { Button } from '@/ui/button';

export function CardioBlock({ day, update }: { day: DraftDay; update: Update }) {
  const t = useT(messages), rows = day.cardio ?? [];
  const change = (next: NonNullable<DraftDay['cardio']>) => update(draft => editDay(draft, day.id, current => ({ ...current,
    is_rest_day: next.length ? false : current.weekday != null && !current.exercises.length,
    cardio: next.map((row, index) => ({ ...row, position: index + 1 })),
  })));
  return <section className="glass rounded-card border border-line-soft">
    <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3.5"><span className="grid size-6 place-items-center rounded-lg bg-surface font-display text-xs font-extrabold">{3}</span>
      <h2 className="font-display text-[19px] font-semibold">{t('cardio')}</h2><span className="text-xs text-faint">{t('optional')}</span>
      <Button type="submit" variant={'secondary'} block={false} className={"ms-auto min-h-12 px-3 text-xs"} onClick={() => change([...rows, { id: uuidv7(), day_id: day.id, position: rows.length + 1, kind: t('walk'), minutes: 20, intensity: 'low', notes: '' }])}>{t('addCardio')}</Button>
    </div>
    {rows.length > 0 && <ol className="space-y-3 p-[18px]">{rows.map((row, index) => <li key={row.id}><CardioRow row={row} first={index === 0} last={index === rows.length - 1}
      onChange={next => change(rows.map(item => item.id === row.id ? next : item))} onRemove={() => change(rows.filter(item => item.id !== row.id))}
      onMove={delta => { const next = [...rows], moved = next.splice(index, 1)[0]; if (moved) next.splice(index + delta, 0, moved); change(next); }} /></li>)}</ol>}
  </section>;
}

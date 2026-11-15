'use client';
import { clickableClass, Button } from '@/ui/button';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { addDay, daySummary, warmupMinutes, programMessages } from '@/features/programs';
import type { ProgramDraft } from '@/features/programs';
import { weekdays, weekly, restDay } from './editor-draft';
import type { Update } from './editor-draft';
import { messages } from './editor/messages';

export function DayRail({ draft, selectedId, onSelect, update }: { draft: ProgramDraft; selectedId?: string; onSelect: (id: string) => void; update: Update }) {
  const t = useT(messages), pt = useT(programMessages), [showRest, setShowRest] = useState(false);
  const rests = draft.days.filter(day => day.is_rest_day);
  return <nav aria-label={t('rail')} className="flex min-w-0 gap-2 overflow-x-auto min-[1001px]:sticky min-[1001px]:top-[75px] min-[1001px]:flex-col min-[1001px]:overflow-visible">
    {draft.days.filter(day => !day.is_rest_day || day.id === selectedId).map(day => <button key={day.id} aria-pressed={selectedId === day.id} onClick={() => onSelect(day.id)} className={`${clickableClass} min-h-16 min-w-[140px] shrink-0 rounded-card border px-3.5 py-3 text-start ${selectedId === day.id ? 'border-lime bg-lime-soft' : 'border-line-soft'}`}>
      <b className={`block text-sm font-medium ${selectedId === day.id ? 'text-lime' : ''}`}>{day.title || pt(day.weekday == null ? 'newDay' : weekdays[day.weekday] ?? 'sat')}</b>
      <small className="text-[11.5px] text-faint">{day.is_rest_day ? t('rest') : t(day.weekday == null ? 'rotationLine' : 'dayLine', { weekday: pt(weekdays[day.weekday ?? 0] ?? 'sat'), n: day.exercises.length, m: day.exercises.length ? t('minutes', { n: daySummary(day).minutes + warmupMinutes(day.warmup) }) : t('unknownDuration') })}</small>
    </button>)}
    {rests.length > 0 && <div className="glass min-w-[140px] shrink-0 rounded-card border border-line px-3.5 text-xs text-muted">
      <button className={`${clickableClass} flex min-h-12 w-full items-center justify-between gap-2 rounded-control border border-line bg-surface text-start`} aria-expanded={showRest} onClick={() => setShowRest(value => !value)}>{t('restDays')}<DisclosureChevron expanded={showRest} /></button>
      {showRest && rests.filter(day => day.id !== selectedId).map(day => <Button key={day.id} type="submit" variant={'secondary'} block={false} className={"my-2 block min-h-12 w-full px-3 text-start"} onClick={() => onSelect(day.id)}>{day.title || pt(weekdays[day.weekday ?? 0] ?? 'sat')}</Button>)}
    </div>}
    <Button type="submit" variant={'secondary'} block={false} className={"inline-flex min-h-12 shrink-0 items-center justify-center gap-2 px-4 text-sm"} disabled={weekly(draft) && !rests.length} onClick={() => {
      if (weekly(draft)) { const day = rests[0]; if (day) { update(current => restDay(current, day.id, false)); onSelect(day.id); } }
      else { const id = uuidv7(); update(current => addDay(current, id, pt('newDay'))); onSelect(id); }
    }}><Plus aria-hidden className="size-4" />{t('addTraining')}</Button>
  </nav>;
}

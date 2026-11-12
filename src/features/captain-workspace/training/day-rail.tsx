'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { addDay, daySummary, warmupMinutes, programMessages } from '@/features/programs';
import type { ProgramDraft } from '@/features/programs';
import { trainingDays, weekdays, weekly, restDay } from './editor-draft';
import type { Update } from './editor-draft';
import { messages } from './editor/messages';

export function DayRail({ draft, selectedId, onSelect, update }: { draft: ProgramDraft; selectedId?: string; onSelect: (id: string) => void; update: Update }) {
  const t = useT(messages), pt = useT(programMessages), [showRest, setShowRest] = useState(false);
  const rests = draft.days.filter(day => day.is_rest_day);
  return <nav aria-label={t('rail')} className="flex min-w-0 gap-2 overflow-x-auto min-[1001px]:sticky min-[1001px]:top-[75px] min-[1001px]:flex-col min-[1001px]:overflow-visible">
    {trainingDays(draft).map(day => <button key={day.id} aria-pressed={selectedId === day.id} onClick={() => onSelect(day.id)} className={`min-h-16 min-w-[140px] shrink-0 rounded-card border px-3.5 py-3 text-start ${selectedId === day.id ? 'border-lime bg-lime-soft' : 'border-line-soft'}`}>
      <b className={`block text-sm font-medium ${selectedId === day.id ? 'text-lime' : ''}`}>{day.title || pt(day.weekday == null ? 'newDay' : weekdays[day.weekday] ?? 'sat')}</b>
      <small className="text-[11.5px] text-faint">{t(day.weekday == null ? 'rotationLine' : 'dayLine', { weekday: pt(weekdays[day.weekday ?? 0] ?? 'sat'), n: day.exercises.length, m: daySummary(day).minutes + warmupMinutes(day.warmup) })}</small>
    </button>)}
    {rests.length > 0 && <div className="min-w-[140px] shrink-0 rounded-card border border-dashed border-line-soft px-3.5 text-xs text-faint">
      <button className="min-h-12 w-full text-start" aria-expanded={showRest} onClick={() => setShowRest(value => !value)}>{t('restDays')}</button>
      {showRest && rests.map(day => <button key={day.id} className="block min-h-12 w-full text-start" onClick={() => onSelect(day.id)}>{day.title || pt(weekdays[day.weekday ?? 0] ?? 'sat')}</button>)}
    </div>}
    <button className="min-h-12 shrink-0 rounded-full border border-line-soft px-4 text-sm" disabled={weekly(draft) && !rests.length} onClick={() => {
      if (weekly(draft)) { const day = rests[0]; if (day) { update(current => restDay(current, day.id, false)); onSelect(day.id); } }
      else { const id = uuidv7(); update(current => addDay(current, id, pt('newDay'))); onSelect(id); }
    }}>{t('day')}</button>
  </nav>;
}

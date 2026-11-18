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
import { messages as phoneMessages } from './phone/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function DayRail({ draft, selectedId, onSelect, update }: { draft: ProgramDraft; selectedId?: string; onSelect: (id: string) => void; update: Update }) {
  const t = useT(messages), pt = useT(programMessages), [showRest, setShowRest] = useState(false);
  const phone = useT(phoneMessages), enabled = captainWorkspaceEnabled();
  const rests = draft.days.filter(day => day.is_rest_day);
  return <nav aria-label={t('rail')} className={`glass flex min-w-0 gap-inline overflow-x-auto rounded-card p-inline @min-[760px]:flex-col${enabled ? ' max-md:flex-row! max-md:border-0 max-md:bg-none max-md:p-0 max-md:shadow-none' : ''}`}>
    {draft.days.filter(day => !day.is_rest_day || day.id === selectedId).map(day => <button key={day.id} aria-pressed={selectedId === day.id} onClick={() => onSelect(day.id)} className={`${clickableClass} min-h-16 min-w-[140px] shrink-0 rounded-card border px-card py-stack text-start ${selectedId === day.id ? 'border-lime bg-lime-soft' : 'border-line-soft'}${enabled ? ' max-md:min-h-12 max-md:min-w-12 max-md:rounded-control max-md:border-transparent max-md:bg-surface max-md:px-stack max-md:py-0 max-md:aria-pressed:bg-surface-raised' : ''}`}>
      {enabled && <span className="text-xs text-muted md:hidden">{phone('day', { n: draft.days.indexOf(day) + 1 })}</span>}
      <b className={`block text-sm font-medium ${selectedId === day.id ? 'text-lime' : ''}${enabled ? ' max-md:hidden' : ''}`}>{day.title || pt(day.weekday == null ? 'newDay' : weekdays[day.weekday] ?? 'sat')}</b>
      <small className={enabled ? 'text-micro text-faint max-md:hidden' : 'text-micro text-faint'}>{day.is_rest_day ? t('rest') : t(day.weekday == null ? 'rotationLine' : 'dayLine', { weekday: pt(weekdays[day.weekday ?? 0] ?? 'sat'), n: day.exercises.length, m: day.exercises.length ? t('minutes', { n: daySummary(day).minutes + warmupMinutes(day.warmup) }) : t('unknownDuration') })}</small>
    </button>)}
    {rests.length > 0 && <div className="glass min-w-[140px] shrink-0 rounded-card border border-line px-card text-xs text-muted">
      <button className={`${clickableClass} flex min-h-12 w-full items-center justify-between gap-inline rounded-control border border-line bg-surface text-start`} aria-expanded={showRest} onClick={() => setShowRest(value => !value)}>{t('restDays')}<DisclosureChevron expanded={showRest} /></button>
      {showRest && rests.filter(day => day.id !== selectedId).map(day => <Button key={day.id} type="submit" variant={'secondary'} block={false} className={"my-inline block min-h-12 w-full px-stack text-start"} onClick={() => onSelect(day.id)}>{day.title || pt(weekdays[day.weekday ?? 0] ?? 'sat')}</Button>)}
    </div>}
    <Button type="submit" variant={'secondary'} block={false} className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-inline px-page-x text-sm${enabled ? ' max-md:px-stack' : ''}`} disabled={weekly(draft) && !rests.length} onClick={() => {
      if (weekly(draft)) { const day = rests[0]; if (day) { update(current => restDay(current, day.id, false)); onSelect(day.id); } }
      else { const id = uuidv7(); update(current => addDay(current, id, pt('newDay'))); onSelect(id); }
    }}><Plus aria-hidden className="size-4" />{enabled ? <><span className="max-md:hidden">{t('addTraining')}</span><span className="md:hidden">{phone('addDay')}</span></> : t('addTraining')}</Button>
  </nav>;
}

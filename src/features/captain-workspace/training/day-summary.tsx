'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useT } from '@/core/i18n/client';
import { daySummary, warmupMinutes, renameDay, programMessages } from '@/features/programs';
import type { DraftDay } from '@/features/programs';
import type { Update } from './editor-draft';
import { messages } from './editor/messages';
import { weekdays } from './editor-draft';

export function DaySummary({ day, update }: { day: DraftDay; update: Update }) {
  const t = useT(messages), pt = useT(programMessages), summary = daySummary(day), warm = warmupMinutes(day.warmup);
  return <section className="glass-strong flex flex-wrap items-center gap-[18px] rounded-card px-5 py-[18px]">
    <label className="min-w-0 flex-1 basis-44 text-xs text-faint">{t('dayName')}
      <input aria-label={t('dayName')} placeholder={pt(day.weekday == null ? 'newDay' : weekdays[day.weekday] ?? 'sat')} value={day.title} maxLength={60} className={`${editableFieldClass} block min-h-12 w-full bg-surface font-display text-[19px] font-semibold text-ink`} onChange={event => update(draft => renameDay(draft, day.id, event.target.value))} /></label>
    {!day.is_rest_day && <div className="grid flex-1 basis-64 grid-cols-4 gap-2 text-center">{([
      ['warm', day.exercises.length ? t('minutes', { n: warm }) : t('unknownDuration')], ['exercises', summary.exercises], ['sets', summary.sets], ['duration', day.exercises.length ? `~${t('minutes', { n: summary.minutes + warm })}` : t('unknownDuration')],
    ] as const).map(([key, value]) => <div key={key}><small className="text-[10.5px] text-faint">{t(key)}</small><b dir="ltr" className="block font-display text-base font-extrabold tabular-nums">{value}</b></div>)}</div>}
  </section>;
}

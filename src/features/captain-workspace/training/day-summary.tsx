'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useT } from '@/core/i18n/client';
import { StatStrip } from '@/ui/stat-strip';
import { daySummary, warmupMinutes, renameDay, programMessages } from '@/features/programs';
import type { DraftDay } from '@/features/programs';
import type { Update } from './editor-draft';
import { messages } from './editor/messages';
import { weekdays } from './editor-draft';

export function DaySummary({ day, update }: { day: DraftDay; update: Update }) {
  const t = useT(messages), pt = useT(programMessages), summary = daySummary(day), warm = warmupMinutes(day.warmup);
  return <section className="glass-strong flex flex-wrap items-center gap-card-gap rounded-card px-page-x py-page-y">
    <label className="min-w-0 flex-1 basis-44 text-xs text-faint">{t('dayName')}
      <input aria-label={t('dayName')} placeholder={pt(day.weekday == null ? 'newDay' : weekdays[day.weekday] ?? 'sat')} value={day.title} maxLength={60} className={`${editableFieldClass} block min-h-12 w-full bg-surface font-display text-title font-semibold text-ink`} onChange={event => update(draft => renameDay(draft, day.id, event.target.value))} /></label>
    {!day.is_rest_day && <StatStrip className="flex-1 basis-64" items={([
      ['warm', day.exercises.length ? t('minutes', { n: warm }) : t('unknownDuration')], ['exercises', summary.exercises], ['sets', summary.sets], ['duration', day.exercises.length ? `~${t('minutes', { n: summary.minutes + warm })}` : t('unknownDuration')],
    ] as const).map(([key, value]) => ({ label: t(key), value: <bdi dir="ltr">{value}</bdi> }))} />}
  </section>;
}

'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { useViewerTimezone } from '@/core/timezone/client';
import { formatTimestampAr } from '@/lib/dates';
import { timezoneMidnight } from '@/lib/timezone';
import type { PlayerFacts } from '@/features/player-file';
import type { Macros } from '@/lib/macros';
import { Button } from '@/ui';
import type { Meal } from '../types';
import { planAdherence, smartNotes } from '../smart-notes';
import type { AdherenceLog } from '../smart-notes';
import { messages } from './editor/messages';
import { flagLabels } from './editor/flag-labels';

export function SmartNotesPanel({ meals, planMeals, targets, facts, logs, today, onIncrease, sent = true }: {
  meals: Meal[]; targets: Macros; facts: PlayerFacts; logs: AdherenceLog[]; today: string;
  onIncrease: (id: string, grams: number) => void; planMeals: Meal[]; sent?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const timezone = useViewerTimezone();
  const notes = smartNotes(meals, targets, facts);
  const days = planAdherence(logs, today, planMeals, facts.trainingDays?.value ?? []);
  return <aside className="glass grid content-start gap-4 rounded-card p-5">
    <h2 className="font-bold">{t('notes')}</h2>
    {!notes.length && <p className="text-muted">{t('clear')}</p>}
    <ul className="grid gap-3">{notes.map(note => <li key={`${note.kind}-${note.itemId}`} className={note.kind === 'allergy' ? 'text-danger' : 'text-muted'}>
      {note.kind === 'allergy' ? t('conflict', { name: note.name, reason: flagLabels(note.reasons, t) })
        : <>{t('gap', { name: note.name, grams: note.grams, macro: t(note.macro) })}<Button variant="secondary" onClick={() => onIncrease(note.itemId, note.grams)}>{t('apply')}</Button></>}
    </li>)}</ul>
    <h3>{t('adherence')}</h3>
    {!sent ? <p className="text-sm text-muted">{t('notSent')}</p> : <ul className="grid grid-cols-7 gap-2">{days.map(day => {
      const weekday = formatTimestampAr(new Date(timezoneMidnight(day.date, timezone) + 12 * 3600000).toISOString(), { weekday: 'short' }, locale, timezone);
      const status = day.completed > 0 ? day.expected > 0 && day.completed >= day.expected ? 'full' : 'partial' : 'none';
      return <li key={day.date} data-adherence={status} aria-label={t('day', { date: weekday, done: day.completed, total: day.expected })}
        className="grid justify-items-center gap-2 text-xs text-muted">
        <span>{weekday}</span><span aria-hidden className={`size-2 rounded-full border ${status === 'full' ? 'border-lime bg-lime' : status === 'partial' ? 'border-muted bg-muted' : 'border-line'}`} />
      </li>;
    })}</ul>}
  </aside>;
}

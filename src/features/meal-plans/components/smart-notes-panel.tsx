'use client';
import { useT } from '@/core/i18n/client';
import type { PlayerFacts } from '@/features/player-file';
import type { Macros } from '@/lib/macros';
import { Button } from '@/ui';
import type { Meal } from '../types';
import { planAdherence, smartNotes } from '../smart-notes';
import type { AdherenceLog } from '../smart-notes';
import { messages } from './editor/messages';
import { flagLabels } from './editor/flag-labels';

export function SmartNotesPanel({ meals, planMeals, targets, facts, logs, today, onIncrease }: {
  meals: Meal[]; targets: Macros; facts: PlayerFacts; logs: AdherenceLog[]; today: string;
  onIncrease: (id: string, grams: number) => void; planMeals: Meal[];
}) {
  const t = useT(messages);
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
    <ul className="flex flex-wrap gap-2">{days.map(day => <li key={day.date} className={`rounded-control border border-line p-2 ${day.completed && day.completed >= day.expected ? 'text-lime' : 'text-muted'}`}>
      {t('day', { date: day.date, done: day.completed, total: day.expected })}
    </li>)}</ul>
  </aside>;
}

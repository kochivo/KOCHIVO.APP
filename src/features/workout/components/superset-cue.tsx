'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '@/lib/training/messages';
import { supersetLabel, supersetTag } from '@/lib/superset';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import type { useFocusSession } from '../hooks/use-focus-session';

export function SupersetCue({ state, next = false }: { state: Pick<ReturnType<typeof useFocusSession>, 'current' | 'next' | 'day'>; next?: boolean }) {
  const t = useT(messages), locale = useLocale(), { current, day } = state;
  if (!current || !day || current.exercise.superset_group === null) return null;
  const members = day.exercises.filter(row => row.superset_group === current.exercise.superset_group);
  if (members.length < 2) return null;
  const letter = supersetLabel(day.exercises, current.exercise) ?? '';
  if (next) {
    if (!state.next || state.next.exercise.id === current.exercise.id || state.next.exercise.superset_group !== current.exercise.superset_group || current.restAfter > 0) return null;
    return <aside className="flex items-center gap-stack rounded-card border border-lime/40 bg-lime-soft p-card">
      <b className="text-lime" dir="ltr">{supersetTag(day.exercises, state.next.exercise)}</b>
      <div><p className="text-sm font-semibold">{t('next', { name: exerciseName(state.next.exercise, locale) })}</p><p className="text-xs text-muted">{t('nextHint')}</p></div>
    </aside>;
  }
  return <header className="flex flex-wrap items-center justify-between gap-stack">
    <div><h2 className="text-title font-semibold text-lime">{t('superset', { letter })}</h2>
      <p className="text-xs text-muted">{t('round', { current: formatNumber(current.setIndex, locale), total: formatNumber(current.exercise.sets, locale) })}</p></div>
    <bdi className="rounded-full bg-lime-soft px-stack py-inline text-xs text-lime">{members.map(row => supersetTag(day.exercises, row)).join(locale === 'ar' ? ' ← ' : ' → ')}</bdi>
  </header>;
}

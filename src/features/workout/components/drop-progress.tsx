'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '@/lib/training/messages';
import { dropWeights, targetForSet } from '@/lib/set-plan';
import { formatNumber } from '@/lib/format';
import type { useFocusSession } from '../hooks/use-focus-session';

export function DropProgress({ state }: { state: Pick<ReturnType<typeof useFocusSession>, 'current' | 'doneSets' | 'weight'> }) {
  const t = useT(messages), locale = useLocale(), current = state.current;
  if (!current || !(current.dropIndex && current.dropIndex > 0)) return null;
  const drop = targetForSet(current.exercise, current.setIndex - 1).drop;
  if (!drop) return null;
  const rows = state.doneSets.filter(row => row.program_exercise_id === current.exercise.id && row.set_index === current.setIndex);
  const weights = Array.from({ length: drop.count + 1 }, (_, index) => index).reduce<number[]>((weights, index) => {
    const saved = rows.find(row => (row.drop_index ?? 0) === index);
    const previous = weights.at(-1) ?? 0;
    return [...weights, saved?.weight_kg ?? (index === current.dropIndex ? state.weight :
      index === 0 ? 0 : dropWeights(previous, 1, drop.percent)[0] ?? 0)];
  }, []);
  return <section className="space-y-stack" aria-label={t('drop')}>
    <p className="text-sm text-warn">{t('reduce')}</p>
    <ol className="space-y-stack">{Array.from({ length: drop.count + 1 }, (_, index) => {
      const saved = rows.find(row => (row.drop_index ?? 0) === index);
      const active = index === current.dropIndex;
      const weight = weights[index] ?? 0;
      return <li key={index} aria-current={active ? 'step' : undefined}
        className={`flex items-center justify-between gap-stack rounded-card border p-card ${active ? 'glass-strong border-warn bg-warn-soft' : 'glass border-line-soft'} ${saved ? 'text-muted' : ''}`}>
        <div><p className={`text-xs ${active ? 'text-warn' : 'text-muted'}`}>{index === 0 ? t('main') : t('dropNumber', { n: formatNumber(index, locale), percent: drop.percent })}</p>
          <bdi className="font-display text-h font-extrabold tabular-nums">{formatNumber(weight, locale)}</bdi></div>
        <span className="text-sm">{saved ? t('targetReps', { reps: formatNumber(saved.reps ?? 0, locale) }) : drop.mode === 'failure' ? t('failure') : t('targetReps', { reps: formatNumber(drop.reps ?? 0, locale) })}</span>
      </li>;
    })}</ol>
    <p className="text-xs text-muted">{t('rounded')}</p>
  </section>;
}

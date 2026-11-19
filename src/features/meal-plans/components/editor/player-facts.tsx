'use client';

import { useLocale, useT } from '@/core/i18n/client';
import type { PlayerFacts } from '@/features/player-file';
import { formatNumber } from '@/lib/format';
import { FactRow } from '@/ui/fact-row';
import { planAdherence } from '../../smart-notes';
import type { AdherenceLog } from '../../smart-notes';
import type { Meal } from '../../types';
import { messages } from './workspace/messages';

export function PlayerFactsCard({ name, facts, meals, logs, today, sent }: {
  name: string; facts: PlayerFacts; meals: Meal[]; logs: AdherenceLog[]; today: string; sent: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const number = (value?: number) => value === undefined ? '—' : formatNumber(value, locale);
  const weight = facts.weight?.value;
  const target = facts.targetWeight?.value;
  const goal = target == null || weight == null || target === weight ? 'maintain' : target < weight ? 'cut' : 'muscle';
  const done = planAdherence(logs, today, meals, facts.trainingDays?.value ?? [])
    .filter(day => day.expected > 0 && day.completed >= day.expected).length;
  return <aside className="glass rounded-card border border-line-soft px-page-x py-page-y min-[1001px]:sticky min-[1001px]:top-5">
    <h2 className="mb-inline font-display text-base font-semibold">{t('playerFacts', { name })}</h2>
    <dl>
      <FactRow label={t('goal')}>{t(goal)}</FactRow>
      <FactRow label={t('weight')}>{t('weightValue', { weight: number(weight) })}</FactRow>
      <FactRow label={t('ageHeight')}>{t('ageHeightValue', { n: facts.age?.value ?? 0, age: number(facts.age?.value), height: number(facts.height?.value) })}</FactRow>
      <FactRow label={t('weekly')}>{sent ? t('weeklyValue', { done: number(done) }) : t('unsent')}</FactRow>
    </dl>
  </aside>;
}

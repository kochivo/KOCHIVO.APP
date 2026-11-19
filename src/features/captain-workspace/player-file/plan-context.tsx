import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { localDate, formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { FactRow } from '@/ui/fact-row';
import { messages } from './messages';
import type { Profile } from './types';

export function PlanContext({ profile, locale, kind, timezone }: { profile: Profile; locale: Locale; kind: 'training' | 'nutrition'; timezone: string }) {
  const t = createT(messages, locale), pt = t;
  const plan = kind === 'training' ? profile.program : profile.nutrition;
  if (!plan) return null;
  const n = (value: number | null) => value === null ? t('unavailable') : formatNumber(value, locale);
  return <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
    <h2 className="font-display text-title font-semibold">{t('currentPlan')}</h2>
    <dl>
      {kind === 'training' && profile.program && <FactRow label={t('training')}>{pt('programSummary', {
          days: pt('programSummaryDays', { n: profile.program.days, days: n(profile.program.days) }),
          exercises: pt('programSummaryExercises', { n: profile.program.exercises, exercises: n(profile.program.exercises) }),
        })}</FactRow>}
      {kind === 'nutrition' && profile.nutrition && <>
        <FactRow label={t('nutrition')}>{pt('nutritionSummary', { n: profile.nutrition.meals, meals: n(profile.nutrition.meals), kcal: n(profile.nutrition.kcal) })}</FactRow>
        <FactRow label={t('goal')}>{pt('macros', { protein: n(profile.nutrition.protein), carbs: n(profile.nutrition.carbs), fat: n(profile.nutrition.fat) })}</FactRow>
      </>}
      <FactRow label={t('currentPlan')}>{pt('updated', { date: formatDateAr(localDate(new Date(plan.updatedAt), timezone), { day: 'numeric', month: 'long' }, locale) })}</FactRow>
    </dl>
  </section>;
}

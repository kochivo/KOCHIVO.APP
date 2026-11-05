import Link from 'next/link';
import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { fetchPlanSummary } from '../data/plan-summary';
import { PlanBadgeError } from './plan-badge-error';

// The captain's own plan lives on the billing page; this keeps it visible from the roster.
export async function PlanBadge() {
  const [summary, t, locale] = await Promise.all([fetchPlanSummary(), getT(messages), getLocale()]);
  if (!summary) return <PlanBadgeError message={t('planLoadFailed')} retryLabel={t('retry')} />;
  const { plan, used } = summary;
  const tier = plan.tier === 'entry' || plan.tier === 'champion' || plan.tier === 'legend' || plan.tier === 'empire'
    ? t(plan.tier) : plan.tier;
  const full = used >= plan.player_limit;
  return <Link href="/captain/billing" className="glass inline-flex min-h-12 items-center gap-2 rounded-control px-4 text-sm font-bold">
    <span>{t('myPlan')}: {tier}</span>
    <span aria-hidden className="text-muted">·</span>
    <span className={full ? 'text-warn' : 'text-muted'}>
      {t('usage', { used: formatNumber(used, locale), n: plan.player_limit, count: formatNumber(plan.player_limit, locale) })}
    </span>
  </Link>;
}

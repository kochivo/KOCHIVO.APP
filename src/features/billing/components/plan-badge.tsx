import Link from 'next/link';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import type { PlanSummary } from '../data/plan-summary';
import { PlanBadgeError } from './plan-badge-error';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { buttonClass } from '@/ui/button';

// Keep the plan reachable from roster capacity warnings.
export async function PlanBadge({ data }: { data: Promise<[PlanSummary | null, Locale]> }) {
  const [summary, locale] = await data;
  const t = createT(messages, locale);
  if (!summary) return <PlanBadgeError message={t('planLoadFailed')} retryLabel={t('retry')} />;
  const { plan, used } = summary;
  const tier = plan.tier === 'entry' || plan.tier === 'champion' || plan.tier === 'legend' || plan.tier === 'empire'
    ? t(plan.tier) : plan.tier;
  const full = used >= plan.player_limit;
  return <Link href={captainWorkspaceEnabled() ? '/captain/settings' : '/captain/billing'} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center gap-inline px-page-x text-sm font-bold" })}>
    <span>{t('myPlan')}: {tier}</span>
    <span aria-hidden className="text-muted">·</span>
    <span className={full ? 'text-warn' : 'text-muted'}>
      {t('usage', { used: formatNumber(used, locale), n: plan.player_limit, count: formatNumber(plan.player_limit, locale) })}
    </span>
  </Link>;
}

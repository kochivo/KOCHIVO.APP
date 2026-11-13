import Link from 'next/link';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import type { PlanSummary } from '../data/plan-summary';
import { PlanBadgeError } from './plan-badge-error';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function PlanSidebar({ data }: { data: Promise<[PlanSummary | null, Locale]> }) {
  const [summary, locale] = await data;
  const t = createT(messages, locale);
  if (!summary) return <PlanBadgeError message={t('planLoadFailed')} retryLabel={t('retry')} />;
  const { plan, used } = summary;
  const tier = plan.tier === 'entry' || plan.tier === 'champion' || plan.tier === 'legend' || plan.tier === 'empire'
    ? t(plan.tier) : plan.tier;
  const full = used >= plan.player_limit;
  const usage = t('usage', { used: formatNumber(used, locale), n: plan.player_limit, count: formatNumber(plan.player_limit, locale) });
  const percent = plan.player_limit > 0 ? Math.min(100, Math.max(0, used / plan.player_limit * 100)) : 100;
  if (captainWorkspaceEnabled()) return <Link href="/captain/settings" className="glass block min-h-12 rounded-full border border-line px-4 py-3 text-xs hover:bg-ink/10">
    {tier}<span aria-hidden> · </span>{usage}
  </Link>;
  return <Link href="/captain/billing" className="block min-h-12 min-w-0 space-y-2 rounded-control px-3 py-2 text-sm">
    <p className="font-bold">{t('myPlan')}: {tier}</p>
    <p className={full ? 'text-warn' : 'text-muted'}>{usage}</p>
    <div role="progressbar" aria-label={usage} aria-valuemin={0} aria-valuemax={plan.player_limit}
      aria-valuenow={Math.min(used, plan.player_limit)} className="h-1 overflow-hidden rounded-full bg-surface-raised">
      <div className={`h-full rounded-full ${full ? 'bg-warn' : 'bg-lime'}`} style={{ width: `${percent}%` }} />
    </div>
  </Link>;
}

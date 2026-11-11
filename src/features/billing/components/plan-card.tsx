'use client';
import { useTimezone } from '@/core/timezone/client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Button, GlassCard, ProgressBar } from '@/ui';
import { formatTimestampAr } from '@/lib/dates';
import { waLink } from '../renew';
import type { Plan } from '../types';
import { publicConfig } from '@/lib/public-config';
import { useDemoExpiry } from '@/features/demo';


export function PlanCard({ plan, used, subscriptionEnd }: { plan: Plan; used: number; subscriptionEnd: string | null }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const locale = useLocale();
  const demo = useDemoExpiry();
  const tierName = plan.tier === 'entry' || plan.tier === 'champion' || plan.tier === 'legend' || plan.tier === 'empire'
    ? t(plan.tier) : plan.tier;
  const upgrade = waLink(publicConfig.ownerWhatsapp, t('upgradeMessage', { tier: tierName }));
  return (
    <GlassCard level="strong" className="space-y-5 p-6">
      <div><h2 className="text-xl font-bold">{t('myPlan')}</h2><p className="mt-3 text-3xl font-extrabold">{tierName}</p></div>
      <p className="text-muted">{t('price', { price: formatNumber(plan.price_egp, locale), n: plan.player_limit, count: formatNumber(plan.player_limit, locale) })}</p>
      <div className="space-y-3">
        <p className="text-lg font-bold">{t('usage', { used: formatNumber(used, locale), n: plan.player_limit, count: formatNumber(plan.player_limit, locale) })}</p>
        <ProgressBar value={used} max={plan.player_limit} aria-label={t('usedPlayers')} aria-valuetext={t('usage', { used: formatNumber(used, locale), n: plan.player_limit, count: formatNumber(plan.player_limit, locale) })} />
      </div>
      {subscriptionEnd && <p className="text-sm text-muted">{t('paidUntil')} <time dateTime={subscriptionEnd}>{formatTimestampAr(subscriptionEnd, { day: 'numeric', month: 'long', year: 'numeric' }, locale, timezone)}</time></p>}
      {!demo && (upgrade ? <a href={upgrade} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-line px-4 font-bold hover:bg-surface-raised">{t('upgrade')}</a>
        : <><Button variant="ghost" disabled className="min-h-12 w-full" aria-describedby="owner-phone-missing">{t('upgrade')}</Button><p id="owner-phone-missing" className="text-sm text-muted">{t('noSupport')}</p></>)}
      {!demo && <p className="text-sm text-muted">{t('activationHint')}</p>}
    </GlassCard>
  );
}

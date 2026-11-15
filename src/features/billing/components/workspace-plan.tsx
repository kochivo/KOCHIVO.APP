'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { ProgressBar } from '@/ui/progress-bar';
import { useDemoExpiry } from '@/features/demo';
import { publicConfig } from '@/lib/public-config';
import { formatNumber } from '@/lib/format';
import { formatTimestampAr } from '@/lib/dates';
import { useTimezone } from '@/core/timezone/client';
import { waLink } from '../renew';
import { messages as legacyMessages } from '../messages';
import { messages } from '../workspace/messages';
import type { BillingData } from '../types';
import { buttonClass, Button } from '@/ui/button';

export function WorkspacePlan({ data }: { data: Pick<BillingData, 'plan' | 'used' | 'subscriptionEnd'> }) {
  const t = useT(messages), legacy = useT(legacyMessages), locale = useLocale(), demo = useDemoExpiry();
  const timezone = useTimezone();
  const { plan, used } = data;
  const tier = plan.tier === 'entry' || plan.tier === 'champion' || plan.tier === 'legend' || plan.tier === 'empire' ? legacy(plan.tier) : plan.tier;
  const usage = t('usage', { used: formatNumber(used, locale), n: plan.player_limit, limit: formatNumber(plan.player_limit, locale) });
  const upgrade = waLink(publicConfig.ownerWhatsapp, legacy('upgradeMessage', { tier }));
  return <section className="glass-strong rounded-card border border-line px-5 py-[18px]">
    <p className="text-xs text-faint">{t('plan')}</p><h2 className="my-1.5 font-display text-[19px] font-semibold">{tier}</h2>
    <p className="font-display text-[22px] font-extrabold tabular-nums">{formatNumber(used, locale)} <small className="font-sans text-xs font-medium text-faint">{t('usageTail', { n: plan.player_limit, limit: formatNumber(plan.player_limit, locale) })}</small></p>
    <ProgressBar className="mb-3.5 mt-2.5" value={used} max={plan.player_limit} aria-label={usage} />
    <p className="mb-3 text-xs text-muted">{legacy('price', { price: formatNumber(plan.price_egp, locale), n: plan.player_limit, count: formatNumber(plan.player_limit, locale) })}</p>
    {data.subscriptionEnd && <p className="mb-3 text-xs text-muted">{legacy('paidUntil')} <time dateTime={data.subscriptionEnd}>{formatTimestampAr(data.subscriptionEnd, { day: 'numeric', month: 'long', year: 'numeric' }, locale, timezone)}</time></p>}
    {!demo && (upgrade ? <a href={upgrade} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 w-full items-center justify-center px-3 text-[12.5px]" })}>{t('upgrade')}</a>
      : <><Button disabled type="submit" variant={'secondary'} block={false} className={"min-h-12 w-full text-muted"}>{t('upgrade')}</Button><p className="text-xs text-faint">{legacy('noSupport')}</p></>)}
    {!demo && <p className="mt-2 text-xs text-faint">{legacy('activationHint')}</p>}
  </section>;
}

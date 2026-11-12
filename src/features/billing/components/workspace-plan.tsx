'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { ProgressBar } from '@/ui/progress-bar';
import { useDemoExpiry } from '@/features/demo';
import { publicConfig } from '@/lib/public-config';
import { formatNumber } from '@/lib/format';
import { waLink } from '../renew';
import { messages as legacyMessages } from '../messages';
import { messages } from '../workspace/messages';
import type { BillingData } from '../types';

export function WorkspacePlan({ data }: { data: BillingData }) {
  const t = useT(messages), legacy = useT(legacyMessages), locale = useLocale(), demo = useDemoExpiry();
  const { plan, used } = data;
  const tier = plan.tier === 'entry' || plan.tier === 'champion' || plan.tier === 'legend' || plan.tier === 'empire' ? legacy(plan.tier) : plan.tier;
  const usage = t('usage', { used: formatNumber(used, locale), limit: formatNumber(plan.player_limit, locale) });
  const upgrade = waLink(publicConfig.ownerWhatsapp, legacy('upgradeMessage', { tier }));
  return <section className="glass-strong rounded-card border border-line px-5 py-[18px]">
    <p className="text-xs text-faint">{t('plan')}</p><h2 className="my-1.5 font-display text-[19px] font-semibold">{tier}</h2>
    <p className="font-display text-[22px] font-extrabold tabular-nums">{formatNumber(used, locale)} <small className="font-sans text-xs font-medium text-faint">{t('usageTail', { limit: formatNumber(plan.player_limit, locale) })}</small></p>
    <ProgressBar className="mb-3.5 mt-2.5" value={used} max={plan.player_limit} aria-label={usage} />
    {!demo && (upgrade ? <a href={upgrade} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line px-3 text-[12.5px]">{t('upgrade')}</a>
      : <><button disabled className="min-h-12 w-full rounded-full border border-line text-muted">{t('upgrade')}</button><p className="text-xs text-faint">{legacy('noSupport')}</p></>)}
  </section>;
}

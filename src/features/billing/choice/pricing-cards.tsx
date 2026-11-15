'use client';
import { useEffect, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { countdown, pricingBanner, pricingCards, pricingDurations, durationLabel as sharedDurationLabel } from '../package-choice';
import type { PricingCatalog } from '../package-choice';
import { messages } from './messages';
import { Button, buttonClass } from '@/ui/button';

export type PricingProps = { catalog: PricingCatalog; name: string; now: string; signup?: string;
  isRenewal?: boolean; busy?: boolean; onChoose?: (packageId: string, offerId: string | null) => void };
export function PricingCards({ catalog, name, now, signup, isRenewal = false, onChoose, busy }: PricingProps) {
  const t = useT(messages), locale = useLocale();
  const { durations, selected } = pricingDurations(catalog);
  const [days, setDays] = useState(selected), [clock, setClock] = useState(Date.parse(now));
  useEffect(() => {
    const tick = () => setClock(Date.now());
    tick(); const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const cards = pricingCards(catalog, days, isRenewal, new Date(clock));
  const banner = pricingBanner(catalog, isRenewal, new Date(clock));
  const time = banner ? countdown(banner.ends_at, clock) : null;
  const covered = banner ? [...new Set(catalog.packages.filter(p => p.kind === 'days' && (banner.scope === 'all'
    || (banner.scope === 'packages' && banner.package_ids.includes(p.id))
    || (banner.scope === 'tiers' && p.tier_id !== null && banner.tier_ids.includes(p.tier_id)))).map(p => p.days))].sort((a, b) => a - b) : [];
  const durationLabel = (duration: number) => sharedDurationLabel(duration, t, locale);
  return <section className="mx-auto w-full max-w-[1060px] space-y-[18px]">
    {banner && time && <div role="status" className="flex flex-wrap items-center gap-3 rounded-[18px] border border-warn/30 bg-warn-soft px-[18px] py-3.5">
      <b className="text-warn">{banner.name}</b>
      <span className="text-[13px] text-muted">{t(banner.kind === 'percent' ? 'percentOffer' : banner.kind === 'amount' ? 'amountOffer' : 'bonusOffer', {
        value: formatNumber(banner.value, locale), durations: covered.map(durationLabel).join(t('durationSeparator')),
      })}</span>
      <span className="ms-auto font-display text-sm font-extrabold tabular-nums text-warn">{time.ended ? t('ended')
        : t('remaining', { days: formatNumber(time.days, locale), hours: formatNumber(time.hours, locale) })}</span>
    </div>}
    <header className="space-y-1.5 text-center"><h2 className="font-display text-[30px] font-semibold leading-tight">{t('title', { name })}</h2>
      <p className="text-[13px] text-muted">{t('hint')}</p></header>
    <div className="flex justify-center"><div className="flex flex-wrap justify-center gap-1 rounded-full border border-line p-1">
      {durations.map(duration => <button type="button" key={duration} aria-pressed={days === duration} onClick={() => setDays(duration)}
        className={`min-h-12 rounded-full px-5 text-sm ${duration === days ? 'bg-lime font-semibold text-on-lime' : 'text-muted'}`}>
        {durationLabel(duration)}
      </button>)}</div></div>
    {cards.length ? <div className="grid items-stretch gap-3.5 min-[1001px]:grid-cols-3">{cards.map(card => {
      const href = signup ? `${signup}&package=${card.pkg.id}${card.offer ? `&offer=${card.offer.id}` : ''}` : undefined;
      const action = buttonClass({ variant: card.tier.is_featured ? 'primary' : 'secondary', block: false });
      return <article key={card.tier.id} className={`glass relative flex flex-col gap-2.5 rounded-card border px-5 py-[22px] ${card.tier.is_featured ? 'border-lime bg-gradient-to-b from-lime/10 to-transparent' : 'border-line-soft'}`}>
        {card.tier.is_featured && <span className="absolute -top-3 start-5 rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-on-lime">{t('popular')}</span>}
        <h3 className="font-display text-[19px] font-semibold">{card.tier.name}</h3><p className="text-xs text-faint">{card.tier.description}</p>
        <div className="glass-strong flex flex-wrap items-baseline gap-2 rounded-control px-3 py-2"><b className="font-display text-[32px] font-extrabold tabular-nums">{formatNumber(card.price, locale)}</b>
          <small className="text-faint">{t('currency')}</small>{card.price < card.listPrice && <s className="font-display text-[15px] text-faint">{formatNumber(card.listPrice, locale)}</s>}</div>
        <p className={`text-xs ${banner && !time?.ended && !card.offer ? 'text-faint' : 'text-warn'}`}>{banner && !time?.ended && !card.offer ? t('excluded') : t('monthly', { price: formatNumber(card.monthly, locale) })}</p>
        {card.offer?.kind === 'bonus_days' && <p className="text-xs text-warn">{t('bonus', { days: formatNumber(card.offer.value, locale) })}</p>}
        <ul className="flex-1 text-[13px] leading-[2.1] text-muted">{card.features.map(feature => <li key={feature.text} className={`flex items-start gap-2 ${feature.included ? '' : 'text-faint'}`}>
          {feature.included ? <Check aria-hidden className="mt-1.5 size-4 shrink-0 text-lime" /> : <Minus aria-hidden className="mt-1.5 size-4 shrink-0" />}{feature.text}</li>)}</ul>
        {href ? <a href={href} className={action}>{t('choose', { tier: card.tier.name })}</a>
          : <Button type="button" variant={card.tier.is_featured ? 'primary' : 'secondary'} block={false} disabled={busy} onClick={() => onChoose?.(card.pkg.id, card.offer?.id ?? null)}>{t('choose', { tier: card.tier.name })}</Button>}
      </article>;
    })}</div> : <p className="glass rounded-card p-5 text-faint">{t('empty')}</p>}
  </section>;
}

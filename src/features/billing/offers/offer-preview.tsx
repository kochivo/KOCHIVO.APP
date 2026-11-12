'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { daysBetween, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { finalPrice } from '../pricing';
import { messages as tierMessages } from '../tiers/messages';
import { messages } from './messages';
import type { OfferDraft } from './offer-form';
import type { Catalog } from '../tiers/types';

export function OfferPreview({ draft, catalog, now, used }: { draft: OfferDraft; catalog: Catalog; now: Date; used: number }) {
  const t = useT(messages), tiers = useT(tierMessages), locale = useLocale(), zone = useTimezone();
  const item = catalog.packages.find(item => draft.scope === 'all' || draft.scope === 'tiers' && item.tier_id !== null && draft.tier_ids.includes(item.tier_id) || draft.scope === 'packages' && draft.package_ids.includes(item.id));
  const tier = catalog.tiers.find(tier => tier.id === item?.tier_id);
  const value = Number.isFinite(draft.value) && draft.value > 0 ? draft.value : 0;
  const price = item ? finalPrice(item.price_egp, { kind: draft.kind, value }) : 0;
  const days = Number.isFinite(Date.parse(draft.ends)) ? Math.max(0, daysBetween(localDate(now, zone), draft.ends.slice(0, 10))) : 0;
  return <aside className="min-w-0 min-[1001px]:sticky min-[1001px]:top-[75px]">
    <p className="mb-3 text-[11px] text-faint">{t('preview')}</p>
    <div className="glass-strong relative space-y-3 rounded-card border border-lime px-5 py-[22px]">
      <span className="absolute -top-3 start-5 max-w-[calc(100%-40px)] truncate rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-on-lime">{draft.name || t('newOffer')} · {draft.kind === 'percent' ? t('percentValue', { n: value }) : draft.kind === 'amount' ? t('amountValue', { n: value }) : t('gift', { n: value })}</span>
      {item ? <><p className="break-words text-xs text-faint">{tier?.name} · {item.name}</p>
        <div className="flex flex-wrap items-baseline gap-2"><b className="font-display text-[32px] font-extrabold tabular-nums">{formatNumber(price, locale)}</b><small className="text-faint">{tiers('currency')}</small>
          {price !== item.price_egp && <s className="font-display text-[15px] text-faint">{formatNumber(item.price_egp, locale)}</s>}</div>
        {draft.kind === 'bonus_days' && <p className="text-xs text-warn">{t('gift', { n: value })}</p>}
        <p className="text-xs text-warn">{t('previewEnd', { n: days })}{draft.limited && <> · {t('slots', { n: Math.max(0, draft.limit - used) })}</>}</p>
      </> : <p className="text-sm text-faint">{t('noPreview')}</p>}
    </div>
    <p className="mt-[26px] rounded-[18px] border border-dashed border-line px-[18px] py-3.5 text-[12.5px] leading-[1.9] text-muted">{t('note')}</p>
  </aside>;
}

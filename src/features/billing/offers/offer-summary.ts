import { daysBetween, localDate, formatTimestampAr } from '@/lib/dates';
import type { Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import { offerStatus } from '../pricing';
import type { Catalog, CatalogOffer } from '../tiers/types';
import type { messages } from './messages';

type T = Translator<typeof messages>;
export function offerValue(offer: Pick<CatalogOffer, 'kind' | 'value'>, t: T) {
  return t(offer.kind === 'percent' ? 'percentValue' : offer.kind === 'amount' ? 'amountValue' : 'bonusValue', { n: offer.kind === 'bonus_days' && offer.value % 30 === 0 ? offer.value / 30 : offer.value });
}
export function statusLabel(offer: CatalogOffer, now: Date, zone: string, locale: Locale, t: T) {
  const status = offerStatus(offer, now);
  if (status === 'running') {
    const days = Math.max(0, daysBetween(localDate(now, zone), localDate(new Date(offer.ends_at), zone)));
    return `${t(status)} · ${t(days === 0 ? 'remainingToday' : 'remaining', { n: days })}`;
  }
  if (status === 'scheduled') return `${t(status)} · ${t('startsOn', { date: formatTimestampAr(offer.starts_at, { day: 'numeric', month: 'long' }, locale, zone) })}`;
  return t(status);
}
export function offerDescription(offer: CatalogOffer, catalog: Catalog, t: T) {
  const scope = offer.scope === 'all' ? t('all') : offer.scope === 'tiers'
    ? catalog.tiers.filter(tier => offer.tier_ids.includes(tier.id)).map(tier => tier.name).join('، ')
    : catalog.packages.filter(item => offer.package_ids.includes(item.id)).map(item => item.name).join('، ');
  return [offer.kind === 'bonus_days' ? t('giftDescription', { n: offer.value, scope }) : t('discount', { value: offerValue(offer, t), scope }),
    t(offer.for_new && offer.for_renewals ? 'both' : offer.for_new ? 'newOnly' : 'renewalOnly'),
    offer.max_uses === null ? t('unlimitedUsage', { used: offer.used_count }) : t('usage', { used: offer.used_count, max: offer.max_uses })].join(' · ');
}

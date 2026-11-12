import type { Tables } from '@/types/database';
import { inputInstant, presetDates, zonedInput } from './preset-dates';

export type OfferDraft = {
  id?: string; name: string; kind: 'percent' | 'amount' | 'bonus_days'; value: number;
  scope: 'all' | 'packages' | 'tiers'; tier_ids: string[]; package_ids: string[];
  starts: string; ends: string; for_new: boolean; for_renewals: boolean; limited: boolean; limit: number;
};
export function offerDraft(now: Date, zone: string, offer?: Tables<'captain_offers'>): OfferDraft {
  if (offer) return { id: offer.id, name: offer.name, kind: offer.kind as OfferDraft['kind'], value: offer.value,
    scope: offer.scope as OfferDraft['scope'], tier_ids: offer.tier_ids, package_ids: offer.package_ids,
    starts: zonedInput(offer.starts_at, zone), ends: zonedInput(offer.ends_at, zone),
    for_new: offer.for_new, for_renewals: offer.for_renewals, limited: offer.max_uses !== null, limit: offer.max_uses ?? 20 };
  return { name: '', kind: 'percent', value: 20, scope: 'all', tier_ids: [], package_ids: [],
    ...presetDates('scratch', now, zone), for_new: true, for_renewals: true, limited: false, limit: 20 };
}
export function validateOffer(draft: OfferDraft) {
  if (!draft.name.trim() || draft.name.trim().length > 40) return 'badName';
  if (!draft.for_new && !draft.for_renewals) return 'noAudience';
  if (!Number.isFinite(Date.parse(draft.starts)) || !Number.isFinite(Date.parse(draft.ends)) || draft.ends <= draft.starts) return 'badDates';
  if (draft.scope === 'tiers' && !draft.tier_ids.length || draft.scope === 'packages' && !draft.package_ids.length) return 'noSelection';
  if (!Number.isFinite(draft.value) || draft.value <= 0
    || draft.kind === 'percent' && (draft.value < 1 || draft.value > 90)
    || draft.kind === 'bonus_days' && (!Number.isInteger(draft.value) || draft.value > 365)
    || draft.limited && (!Number.isInteger(draft.limit) || draft.limit < 1)) return 'badValue';
  return null;
}
export function offerPayload(draft: OfferDraft, zone: string) {
  return { ...(draft.id ? { id: draft.id } : {}), name: draft.name.trim(), kind: draft.kind, value: draft.value,
    scope: draft.scope, tier_ids: draft.scope === 'tiers' ? draft.tier_ids : [], package_ids: draft.scope === 'packages' ? draft.package_ids : [],
    starts_at: inputInstant(draft.starts, zone), ends_at: inputInstant(draft.ends, zone),
    for_new: draft.for_new, for_renewals: draft.for_renewals, max_uses: draft.limited ? draft.limit : null };
}

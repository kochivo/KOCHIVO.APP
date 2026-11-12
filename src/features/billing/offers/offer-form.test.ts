import { expect, it } from 'vitest';
import { offerDraft, validateOffer, offerPayload } from './offer-form';
import { presetDates, zonedInput } from './preset-dates';

const now = new Date('2026-11-12T12:00:00Z');
it('rejects missing audience, reversed dates, empty scopes and invalid values', () => {
  const valid = { ...offerDraft(now, 'Africa/Cairo'), name: 'Sale' };
  expect(validateOffer(valid)).toBeNull();
  expect(validateOffer({ ...valid, for_new: false, for_renewals: false })).toBe('noAudience');
  expect(validateOffer({ ...valid, ends: valid.starts })).toBe('badDates');
  expect(validateOffer({ ...valid, scope: 'tiers' })).toBe('noSelection');
  expect(validateOffer({ ...valid, value: 91 })).toBe('badValue');
  expect(validateOffer({ ...valid, kind: 'bonus_days', value: 1.5 })).toBe('badValue');
  expect(validateOffer({ ...valid, limited: true, limit: 0 })).toBe('badValue');
});
it('converts local captain dates to instants without using the browser timezone', () => {
  const draft = { ...offerDraft(now, 'Africa/Cairo'), name: 'Sale', starts: '2026-11-27T00:00', ends: '2026-11-30T23:59' };
  expect(offerPayload(draft, 'Africa/Cairo').starts_at).toBe('2026-11-26T22:00:00.000Z');
  expect(offerPayload(draft, 'America/New_York').starts_at).toBe('2026-11-27T05:00:00.000Z');
});
it('uses the captain calendar year for presets on either side of New Year', () => {
  const boundary = new Date('2027-01-01T01:00:00Z');
  expect(presetDates('blackFriday', boundary, 'Africa/Cairo')).toEqual({ starts: '2027-11-26T00:00', ends: '2027-11-29T23:59' });
  expect(presetDates('blackFriday', boundary, 'America/New_York')).toEqual({ starts: '2026-11-27T00:00', ends: '2026-11-30T23:59' });
  expect(presetDates('ramadan', now, 'Africa/Cairo').starts).toBe('2026-02-18T00:00');
  expect(presetDates('summer', now, 'Africa/Cairo').starts).toBe('2026-06-01T00:00');
  expect(presetDates('newYear', now, 'Africa/Cairo').ends).toBe('2026-01-07T23:59');
  expect(zonedInput('2026-11-27T05:00:00Z', 'America/New_York')).toBe('2026-11-27T00:00');
});

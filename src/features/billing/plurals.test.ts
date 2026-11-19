import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages as billing } from './messages';
import { messages as offers } from './offers/messages';
import { messages as payments } from './payments/messages';
import { messages as phone } from './phone/messages';

afterEach(() => vi.unstubAllEnvs());

it.each([
  ['ar', 'egyptian', ['لاعب واحد عليه فلوس', 'لاعبين عليهم فلوس', '3 لاعبين عليهم فلوس', '11 لاعب عليهم فلوس', '100 لاعب عليهم فلوس'],
    ['متأخر من امبارح', 'متأخر يومين', 'متأخر 3 أيام', 'متأخر 11 يوم', 'متأخر 100 يوم'],
    ['العرض بيخلص بكرة', 'العرض بيخلص بعد يومين', 'العرض بيخلص بعد 3 أيام', 'العرض بيخلص بعد 11 يوم', 'العرض بيخلص بعد 100 يوم']],
  ['ar', 'standard', ['لاعب واحد عليه مستحقات', 'لاعبان عليهما مستحقات', '3 لاعبين عليهم مستحقات', '11 لاعبًا عليهم مستحقات', '100 لاعب عليهم مستحقات'],
    ['متأخر منذ أمس', 'متأخر يومين', 'متأخر 3 أيام', 'متأخر 11 يومًا', 'متأخر 100 يوم'],
    ['ينتهي العرض غدًا', 'ينتهي العرض بعد يومين', 'ينتهي العرض بعد 3 أيام', 'ينتهي العرض بعد 11 يومًا', 'ينتهي العرض بعد 100 يوم']],
  ['en', 'egyptian', ['1 player owes', '2 players owe', '3 players owe', '11 players owe', '100 players owe'],
    ['Overdue since yesterday', '2 days overdue', '3 days overdue', '11 days overdue', '100 days overdue'],
    ['Offer ends tomorrow', 'Offer ends in 2 days', 'Offer ends in 3 days', 'Offer ends in 11 days', 'Offer ends in 100 days']],
] as const)('inflects billing counts in %s (%s)', (locale, style, owing, late, ending) => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const counts = [1, 2, 3, 11, 100];
  expect(counts.map(n => createT(billing, locale, style)('owingPlayers', { n, count: n }))).toEqual(owing);
  expect(counts.map(n => createT(payments, locale, style)('late', { n, count: n }))).toEqual(late);
  expect(counts.map(n => createT(offers, locale, style)('previewEnd', { n }))).toEqual(ending);
});

it.each([
  ['ar', 'egyptian', 'العرض بيخلص النهارده', 'بيخلص النهارده', 'بيخلص بكرة'],
  ['ar', 'standard', 'ينتهي العرض اليوم', 'ينتهي اليوم', 'ينتهي غدًا'],
  ['en', 'egyptian', 'Offer ends today', 'Ends today', 'Ends tomorrow'],
] as const)('labels today and tomorrow in %s (%s)', (locale, style, offerToday, phoneToday, phoneTomorrow) => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(createT(offers, locale, style)('previewEndToday')).toBe(offerToday);
  const t = createT(phone, locale, style);
  expect(t('endingToday')).toBe(phoneToday);
  expect(t('endingIn', { count: '1' }, 1)).toBe(phoneTomorrow);
});

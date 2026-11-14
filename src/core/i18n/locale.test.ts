import { expect, it } from 'vitest';
import { detectLocale } from './detect-locale';

it.each([
  ['ar-US,en;q=0.9', 'US', 'ar'],
  ['en-GB,ar;q=0.9', 'EG', 'en'],
  ['fr-FR', 'SA', 'ar'],
  ['fr-FR', 'FR', 'en'],
  [undefined, undefined, 'ar'],
  [' fr-FR,ar;q=0.9', undefined, 'ar'],
  [' EN-us ;q=0.8,ar', 'EG', 'en'],
  ['ar', 'US', 'ar'],
  ['en', 'EG', 'en'],
  [undefined, '', 'ar'],
  [undefined, 'US', 'en'],
] as const)('detects %s / %s as %s', (acceptLanguage, country, expected) => {
  expect(detectLocale({ acceptLanguage, country })).toBe(expected);
});

it.each('EG SA AE KW QA BH OM YE IQ JO LB SY PS LY TN DZ MA SD MR SO DJ KM'.split(' '))(
  'uses Arabic for an unsupported browser in %s', country => {
    expect(detectLocale({ acceptLanguage: 'fr', country })).toBe('ar');
  },
);

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PaymentMethodPicker } from './components/payment-method-picker';
import { acceptedMethod } from './payment-methods';

it('hides the picker with no enabled methods', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(PaymentMethodPicker, { methods: [], value: null, onChange: () => {} })));
  expect(html).toBe('');
});

it('renders only enabled options and the selected account in LTR with a copy control', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(PaymentMethodPicker, { methods: [{ method: 'instapay', account_detail: 'coach@instapay', position: 0 }],
      value: 'instapay', onChange: () => {} })));
  expect(html).toContain('value="instapay"');
  expect(html).not.toContain('value="bank_transfer"');
  expect(html).not.toContain('value="cash"');
  expect(html).toContain('dir="ltr"');
  expect(html).toContain('coach@instapay');
  expect(html).toContain('>Copy</button>');
});

it.each([null, '', ' ', 'x'.repeat(81)])('rejects missing or oversized non-cash account details: %s', detail => {
  expect(acceptedMethod.safeParse({ method: 'instapay', account_detail: detail, position: 0 }).success).toBe(false);
});
it('allows cash without an account and accepts an 80-character bank account', () => {
  expect(acceptedMethod.safeParse({ method: 'cash', account_detail: null, position: 2 }).success).toBe(true);
  expect(acceptedMethod.safeParse({ method: 'bank_transfer', account_detail: 'x'.repeat(80), position: 3 }).success).toBe(true);
});

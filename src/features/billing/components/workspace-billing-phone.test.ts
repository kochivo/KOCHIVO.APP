import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceBillingPhoneIncome } from './workspace-billing-phone-income';

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

it('bounds the phone income and payment list to the phone breakpoint', () => {
  const billing = source('./workspace-billing.tsx');
  const payments = source('./workspace-payments-table.tsx');
  expect(billing).toContain('WorkspaceBillingPhoneIncome');
  expect(billing).toContain('max-md:hidden');
  expect(payments).toContain('WorkspaceBillingPhonePayments');
  expect(payments).toContain('min-[1024px]:table');
  expect(payments).toContain('max-md:hidden');
});

it('renders the collected, expected and waiting amounts with the real progress value', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WorkspaceBillingPhoneIncome, { income: 21400, expected: 25000, waiting: 1500 })));
  expect(html).toContain('21,400');
  expect(html).toContain('Of 25,000 expected · 1,500 outstanding');
  expect(html).toContain('aria-valuenow="85.6"');
  expect(html).toContain('aria-valuemax="100"');
});

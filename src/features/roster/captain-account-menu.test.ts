import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { CaptainAccountMenu } from './components/captain-account-menu';

const state = vi.hoisted(() => ({ locale: 'ar' as 'ar' | 'en' }));
vi.mock('@/core/i18n', () => ({ useT: () => createT(messages, state.locale) }));
beforeEach(() => { state.locale = 'ar'; });

it.each(['ar', 'en'] as const)('provides an accessible account disclosure and both destinations in %s', locale => {
  state.locale = locale;
  const html = renderToStaticMarkup(createElement(CaptainAccountMenu));
  const target = html.match(/popovertarget="([^"]+)"/i)?.[1];
  expect(target).toBeTruthy();
  expect(html).toContain(`id="${target}"`);
  expect(html).toContain('popover="auto"');
  expect(html).toContain(locale === 'ar' ? 'حسابي' : 'Account');
  expect(html).toMatch(/href="\/captain\/settings"/);
  expect(html).toMatch(/href="\/captain\/billing"/);
  expect(html).toContain(locale === 'ar' ? 'الإعدادات' : 'Settings');
  expect(html).toContain(locale === 'ar' ? 'الدفعات' : 'Billing');
});

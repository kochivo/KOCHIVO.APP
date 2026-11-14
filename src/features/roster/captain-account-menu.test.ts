import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { accountMessages } from './components/captain-account-messages';
import { CaptainAccountMenu } from './components/captain-account-menu';
import { CaptainAccountContent } from './components/captain-account-content';

const state = vi.hoisted(() => ({ locale: 'ar' as 'ar' | 'en' }));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(accountMessages, state.locale) }));
beforeEach(() => { state.locale = 'ar'; });

it.each(['ar', 'en'] as const)('provides an accessible account disclosure and defers its destinations in %s', locale => {
  state.locale = locale;
  const html = renderToStaticMarkup(createElement(CaptainAccountMenu));
  const target = html.match(/popovertarget="([^"]+)"/i)?.[1];
  expect(target).toBeTruthy();
  expect(html).toContain(`id="${target}"`);
  expect(html).toContain('popover="auto"');
  expect(html).toContain(locale === 'ar' ? 'حسابي' : 'Account');
  expect(html).not.toContain('<nav');
  const content = renderToStaticMarkup(createElement(CaptainAccountContent, { onNavigate: () => {} }));
  expect(content).toMatch(/href="\/captain\/settings"/);
  expect(content).toMatch(/href="\/captain\/billing"/);
  expect(content).toContain(locale === 'ar' ? 'الإعدادات' : 'Settings');
  expect(content).toContain(locale === 'ar' ? 'الدفعات' : 'Billing');
});

it.each(['sidebar', 'sheet'] as const)('supports the workspace %s without the legacy mobile-only restriction', placement => {
  const html = renderToStaticMarkup(createElement(CaptainAccountMenu, { placement }, 'Actual captain'));
  expect(html).toContain('Actual captain');
  expect(html).toContain('popover="auto"');
  expect(html).not.toContain('lg:hidden');
  expect(html).toContain('text-start');
  expect(html).toContain('min-h-12');
});

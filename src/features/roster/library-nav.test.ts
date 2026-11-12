import { afterEach, expect, it, vi } from 'vitest';
import { captainMobileNav, captainNav, captainLinks } from './nav';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { Apple, ClipboardCheck, CreditCard, Dumbbell, Inbox, LayoutDashboard, Salad, Settings, Users } from 'lucide-react';

afterEach(() => vi.unstubAllEnvs());
it('leaves the flag-off navigation unchanged', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(captainNav('/captain').map(item => item.href)).toEqual(captainLinks.map(item => item.href));
  for (const locale of ['ar', 'en'] as const) {
    const t = createT(messages, locale);
    expect(captainNav('/captain', t).map(item => item.label)).toEqual(locale === 'ar'
      ? ['الرئيسية', 'اللاعبين', 'المهام', 'البرامج', 'الدفعات', 'الإعدادات']
      : ['Home', 'Players', 'Tasks', 'Programs', 'Billing', 'Settings']);
    expect(JSON.stringify(captainNav('/captain', t))).toBe(JSON.stringify(captainLinks.map(link => ({
      ...link, label: t(link.label), active: link.href === '/captain',
    }))));
  }
  expect(captainMobileNav('/captain').map(item => item.href)).toEqual([
    '/captain', '/captain/players', '/captain/templates', '/captain/inbox',
  ]);
});
it('groups enabled navigation and keeps four mobile destinations', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const items = captainNav('/captain/library/forms');
  expect(items.map(item => item.label)).toEqual([
    'الرئيسية', 'اللاعبين', 'المتابعة', 'خطط التمارين', 'الأنظمة الغذائية', 'مكتبة الأكلات', 'التقييمات', 'الدفعات', 'الإعدادات',
  ]);
  expect(items.filter(item => item.group).map(item => item.group)).toEqual(['التمرين', 'الأكل', 'الإدارة']);
  expect(items.map(item => item.icon)).toEqual([LayoutDashboard, Users, Inbox, Dumbbell, Salad, Apple, ClipboardCheck, CreditCard, Settings]);
  expect(captainMobileNav('/captain').map(item => item.label)).toEqual(['الرئيسية', 'اللاعبين', 'التمرين', 'الأكل']);
});
it('includes meal plans, foods and forms under the enabled library and retains mobile food navigation', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(captainNav('/captain/library/foods').filter(item => item.href.includes('/library')).map(item => item.href))
    .toEqual(['/captain/library/meal-plans', '/captain/library/foods', '/captain/library/forms']);
  for (const locale of ['ar', 'en'] as const) {
    const plan = captainNav('/captain/library/meal-plans', createT(messages, locale)).find(item => item.href === '/captain/library/meal-plans');
    expect(plan).toMatchObject({ active: true, label: locale === 'ar' ? 'الأنظمة الغذائية' : 'Meal plans' });
  }
  expect(captainMobileNav('/captain/library/foods').some(item => item.href === '/captain/library/foods')).toBe(true);
});
it('uses the same approved Arabic names in both styles on every captain route', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const expected = ['الرئيسية', 'اللاعبين', 'المتابعة', 'خطط التمارين', 'الأنظمة الغذائية', 'مكتبة الأكلات', 'التقييمات', 'الدفعات', 'الإعدادات'];
  const routes = ['/captain', '/captain/players', '/captain/inbox', '/captain/templates', '/captain/library/meal-plans',
    '/captain/library/foods', '/captain/library/forms', '/captain/billing', '/captain/settings'];
  for (const style of ['egyptian', 'standard'] as const) {
    for (const route of routes) {
      const items = captainNav(route, createT(messages, 'ar', style));
      expect(items.map(item => item.label)).toEqual(expected);
      expect(items.filter(item => item.active).map(item => item.href)).toEqual([route]);
    }
  }
  expect(captainNav('/captain', createT(messages, 'en')).map(item => item.label)).toEqual([
    'Home', 'Players', 'Follow-up', 'Training plans', 'Meal plans', 'Food library', 'Assessments', 'Billing', 'Settings',
  ]);
});

import { afterEach, expect, it, vi } from 'vitest';
import { captainMobileNav, captainNav, captainLinks } from './nav';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

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
    'الرئيسية', 'اللاعبين', 'المهام', 'خطط التمارين', 'الأنظمة الغذائية', 'مكتبة الأكلات', 'التقييمات', 'الدفعات', 'الإعدادات',
  ]);
  expect(items.filter(item => item.group).map(item => item.group)).toEqual(['التمارين', 'الأكل', 'الأكل', 'المتابعة']);
  expect(captainMobileNav('/captain').map(item => item.label)).toEqual(['الرئيسية', 'اللاعبين', 'التمارين', 'الأكل']);
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

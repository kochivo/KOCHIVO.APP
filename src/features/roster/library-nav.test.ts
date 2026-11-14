import { afterEach, expect, it, vi } from 'vitest';
import { captainMobileNav, captainNav, captainLinks } from './nav';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { frameMessages } from './components/captain-frame-messages';
import { KoHome, KoPlayers, KoFollowup, KoTraining, KoMealPlans, KoFoods, KoForms, KoBilling, KoSettings } from '@/ui/icons';

afterEach(() => vi.unstubAllEnvs());
it('names assessments consistently in the captain frame and search labels', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const style of ['egyptian', 'standard'] as const) {
    expect(createT(frameMessages, 'ar', style)('forms')).toBe('التقييمات');
  }
  expect(createT(frameMessages, 'en')('forms')).toBe('Assessments');
});
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
    'الرئيسية', 'اللاعبين', 'المتابعة', 'خطط التمارين', 'مكتبة التمارين', 'الأنظمة الغذائية', 'مكتبة الأكلات', 'التقييمات', 'الدفعات', 'الإعدادات',
  ]);
  expect(items.filter(item => item.group).map(item => item.group)).toEqual(['التمارين', 'الأكل', 'الإدارة']);
  expect(items.map(item => item.icon)).toEqual([KoHome, KoPlayers, KoFollowup, KoTraining, KoTraining, KoMealPlans, KoFoods, KoForms, KoBilling, KoSettings]);
  expect(captainMobileNav('/captain').map(item => item.label)).toEqual(['الرئيسية', 'اللاعبين', 'التمارين', 'الأكل']);
});
it('includes meal plans, foods and forms under the enabled library and retains mobile food navigation', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(captainNav('/captain/library/foods').filter(item => item.href.includes('/library')).map(item => item.href))
    .toEqual(['/captain/library/exercises', '/captain/library/meal-plans', '/captain/library/foods', '/captain/library/forms']);
  for (const locale of ['ar', 'en'] as const) {
    const plan = captainNav('/captain/library/meal-plans', createT(messages, locale)).find(item => item.href === '/captain/library/meal-plans');
    expect(plan).toMatchObject({ active: true, label: locale === 'ar' ? 'الأنظمة الغذائية' : 'Meal plans' });
  }
  expect(captainMobileNav('/captain/library/foods').some(item => item.href === '/captain/library/foods')).toBe(true);
});
it('uses the same approved Arabic names in both styles on every captain route', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const expected = ['الرئيسية', 'اللاعبين', 'المتابعة', 'خطط التمارين', 'مكتبة التمارين', 'الأنظمة الغذائية', 'مكتبة الأكلات', 'التقييمات', 'الدفعات', 'الإعدادات'];
  const routes = ['/captain', '/captain/players', '/captain/inbox', '/captain/templates', '/captain/library/exercises', '/captain/library/meal-plans',
    '/captain/library/foods', '/captain/library/forms', '/captain/billing', '/captain/settings'];
  for (const style of ['egyptian', 'standard'] as const) {
    for (const route of routes) {
      const items = captainNav(route, createT(messages, 'ar', style));
      expect(items.map(item => item.label)).toEqual(expected);
      expect(items.filter(item => item.active).map(item => item.href)).toEqual([route]);
    }
  }
  expect(captainNav('/captain', createT(messages, 'en')).map(item => item.label)).toEqual([
    'Home', 'Players', 'Follow-up', 'Training plans', 'Exercise library', 'Meal plans', 'Food library', 'Assessments', 'Billing', 'Settings',
  ]);
});

it('places exercises between training plans and meal plans and activates nested exercise routes', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const items = captainNav('/captain/library/exercises/new');
  expect(items.slice(3, 6).map(item => item.href)).toEqual([
    '/captain/templates', '/captain/library/exercises', '/captain/library/meal-plans',
  ]);
  expect(items.filter(item => item.active).map(item => item.href)).toEqual(['/captain/library/exercises']);
});

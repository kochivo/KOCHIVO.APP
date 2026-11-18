import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { HomeHeroView } from './home-hero-view';
import { HomeTilesView } from './home-tiles-view';
import { PhoneHomeNeeds } from './phone-home-needs';
import { PhoneHomeStats } from './phone-home-stats';
import { SmartAlerts } from '../components/smart-alerts';
import { homeMessages } from './messages';
import { homeV11Messages } from './messages';

const withoutIconIds = (markup: string) => markup.replace(/_R_[a-z0-9]+_/gi, '_R_icon_');

it('adds one phone primary action and keeps the original hero inside the desktop boundary', () => {
  const props = { t: createT(homeV11Messages, 'en'), locale: 'en' as const, tasks: [
    { id: 'checkin:1', playerId: 'p', name: 'Sara', kind: 'checkin' as const, href: '/captain/tasks', urgent: false },
  ], count: 1, completed: 2, adherence: 78 };
  const desktop = renderToStaticMarkup(createElement(HomeHeroView, props));
  const html = renderToStaticMarkup(createElement(HomeHeroView, { ...props, phone: true }));
  expect(withoutIconIds(html)).toContain(`<div class="hidden md:block">${withoutIconIds(desktop)}</div>`);
  expect(html).toContain('Start tasks');
  expect(html).toContain('Sara');
  expect(html.match(/control-primary/g)).toHaveLength(1);
});

it('renders three phone stats from real totals and keeps the four-cell desktop strip', () => {
  const props = { t: createT(homeV11Messages, 'en'), old: createT(homeMessages, 'en'), locale: 'en' as const,
    adherence: 78, previous: 72, trained: 31, active: 40, paid: 21400, pending: 6, progress: 0.4 };
  const desktop = renderToStaticMarkup(createElement(HomeTilesView, props));
  const html = renderToStaticMarkup(createElement(HomeTilesView, { ...props, phone: true }));
  expect(html).toContain(`<div class="hidden md:block">${desktop}</div>`);
  expect(html).toContain('+6%');
  expect(html).toContain('of 40');
  expect(html).toContain('21.4K');
  expect(html).toContain('max-sm:grid-cols-3!');
});

it('renders an adherence change only when a prior reading exists', () => {
  const props = { locale: 'en' as const, adherence: 19, previous: 0, trained: 1, active: 3, paid: 0 };
  expect(renderToStaticMarkup(createElement(PhoneHomeStats, props))).not.toContain('+19%');
  expect(renderToStaticMarkup(createElement(PhoneHomeStats, { ...props, hasPrevious: true }))).toContain('+19%');
});

it('keeps one visible phone empty state when tasks and alerts are both empty', () => {
  const tasks = renderToStaticMarkup(createElement(PhoneHomeNeeds, { locale: 'en', contacts: new Map(), tasks: [] }));
  const alerts = renderToStaticMarkup(createElement(SmartAlerts, { alerts: [], hideEmptyOnPhone: true }));
  expect(tasks).toMatch(/^<section class="[^"]*md:hidden/);
  expect(alerts).toMatch(/^<div[^>]*class="[^"]*max-md:hidden/);
});
it('opens the selected review, an absent player’s chat and the payment workflow', () => {
  const html = renderToStaticMarkup(createElement(PhoneHomeNeeds, { locale: 'en', contacts: new Map(),
    tasks: [
      { id: 'checkin:c', playerId: 'p', name: 'Sara', kind: 'checkin', href: '/captain/tasks', urgent: false },
      { id: 'absent:q', playerId: 'q', name: 'Omar', kind: 'absent', href: '/captain/tasks', days: 5, urgent: true },
    ], debts: [{ playerId: 'd', name: 'Ali', amount: 500 }],
  }));
  expect(html).toContain('/captain/tasks#checkin%3Ac');
  expect(html).toContain('/captain/players/q/chat');
  expect(html).toContain('EGP 500 due');
  expect(html).toContain('href="/captain/billing">Record payment');
});

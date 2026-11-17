import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainPane } from './captain-pane';
import { CaptainHome } from './captain-home';
import { PhonePane } from './phone-pane';
import { GuideCard } from './guide-card';
import { Summary } from './summary';
import { initialState, reduceDemo, summary } from './state';
import { CaptainViews } from './captain-views';
import { DemoHeader } from './demo-header';
import { Workout } from './workout';

const plans = [{ name: 'ENTRY', price: 0, limit: 5 }, { name: 'CHAMPION', price: 399, limit: 20 }, { name: 'LEGEND', price: 699, limit: 40 }, { name: 'EMPIRE', price: 1499, limit: 100 }];
const now = () => 1000;
const noop = () => undefined;
const render = (node: ReactNode) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, node));
const props = () => ({ state: reduceDemo(initialState(0), { type: 'start', n: 20, now: 0 }), dispatch: noop, act: noop, now });

it('renders the real home hero, the four-number strip and money owed from reducer state', () => {
  const html = render(createElement(CaptainHome, props()));
  expect(html).toContain('data-home-hero');
  expect(html).toContain('data-home-tiles');
  expect(html).toContain('16/20');
  expect(html).toContain('1,500');
  expect(html).toContain('4 مهام');
  const updated = render(createElement(CaptainHome, { ...props(), state: { ...props().state, paid: true, renewed: true } }));
  expect(updated).toContain('>500</a>');
  expect(updated).toContain('2 مهام');
  expect(updated).not.toContain('>1,500</a>');
});
it('renders production set rows with logged sets, editable inputs and the pulse source', () => {
  const html = render(createElement(Workout, props()));
  expect(html).toContain('demo-workout');
  expect(html).toContain('demo-exercise-preview');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
  expect(html).toContain('value="65"');
  expect(html).toContain('value="8"');
  expect(html).toContain('aria-current="step"');
  expect(html).toContain('data-demo-source="set"');
  expect(html).not.toContain('min-h-24');
});

it('uses a primary pricing link and puts monitor/phone controls in the view switch', () => {
  const html = render(createElement(DemoHeader, { ...props(), onLanguage: noop }));
  const pricing = html.match(/<a\b[^>]*>/g)?.find(tag => tag.includes('href="/#pricing"'));
  expect(pricing).toContain('control-primary');
  expect(html).toContain('lucide-rotate-ccw');
  const viewSwitch = html.slice(html.indexOf('demo-view-switch'));
  expect(viewSwitch).toContain('lucide-monitor');
  expect(viewSwitch).toContain('lucide-smartphone');
  expect(viewSwitch).toContain('aria-pressed="true"');
  expect(viewSwitch).toContain('aria-pressed="false"');
});

it('labels both panes with the selected player count and captain identity', () => {
  const captain = render(createElement(CaptainPane, { ...props(), plans }));
  expect(captain).toContain('لوحة الكابتن');
  expect(captain).toContain('كابتن هشام، 20 لاعب');
  expect(render(createElement(PhonePane, props()))).toContain('موبايل محمد');
});
it('keeps the device status, scrollable content and tabs in the phone frame', () => {
  const phone = render(createElement(PhonePane, props()));
  expect(phone).toContain('6:42');
  expect(phone).toContain('5G');
  expect(phone.indexOf('data-phone-content')).toBeLessThan(phone.indexOf('data-phone-tabs'));
  expect(phone).toContain('data-demo-source="set"');
  expect(phone).toContain('>60</span>');
  expect(phone).toContain('>62.5</span>');
});
it('puts each initial feed time at the end of its own row', () => {
  const home = render(createElement(CaptainHome, props()));
  for (const time of ['8:10', '7:55', 'أمس']) expect(home).toContain(`<time class="ms-auto shrink-0 text-micro text-muted">${time}</time>`);
});
it('includes the K mark, step counter and restart in the guide', () => {
  const initial = render(createElement(GuideCard, { ...props(), plans, onAccount: noop }));
  expect(decodeURIComponent(initial)).toContain('/brand/icon.png');
  expect(initial).toContain('01');
  const footer = initial.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? '';
  const buttons = footer.match(/<button\b[^>]*>/g) ?? [];
  expect(buttons).toHaveLength(2);
  for (const button of buttons) expect(button).toContain('w-full');
  expect(buttons[0]).toContain('control-secondary');
  expect(buttons[1]).toContain('control-primary');
  const last = render(createElement(GuideCard, { ...props(), state: { ...props().state, step: 12 }, plans, onAccount: noop }));
  expect(last).toContain('من الأول');
});
it('plays all 13 steps from the 6–20 choice, rendering each view and performing its action', () => {
  let state = reduceDemo(initialState(0), { type: 'start', n: 20, now: 1000 });
  const pages = ['home', 'home', 'home', 'home', 'assess', 'inbox', 'player', 'programs', 'food', 'money', 'add', 'home', 'home'];
  const events = [null, null, 'nudge', 'go:assess', 'approve', 'send', null, 'addex', 'swap', 'pay', 'invite', 'set'];
  for (let i = 0; i < 13; i++) {
    expect(state.step).toBe(i);
    expect(state.page).toBe(pages[i]);
    const pane = { ...props(), state };
    const html = render(createElement(state.page === 'home' ? CaptainHome : CaptainViews, pane));
    expect(html).not.toContain('undefined');
    const phone = render(createElement(PhonePane, pane));
    expect(phone).toContain('data-phone-content');
    expect(phone).toContain('data-phone-tabs');
    expect(render(createElement(GuideCard, { ...pane, plans, onAccount: noop }))).toContain(String(i + 1).padStart(2, '0'));
    if (i === 12) break;
    const event = events[i];
    state = reduceDemo(state, event ? { type: 'event', event, text: 'تجربة', now: 1000 + i * 1000 } : { type: 'next', now: 1000 + i * 1000 });
  }
  expect(state.approved && state.nudged && state.paid && state.invite).toBe(true);
  expect(state.threads.mohamed.at(-1)?.text).toBe('تجربة');
  expect(state.sets.at(-1)).toEqual([65, 8]);
  expect(summary(state, 99000)).toEqual({ actions: 9, elapsed: '0:11', players: 20 });
  const last = render(createElement(Summary, { state, plans, now: 99000, onExplore: noop, onAccount: noop }));
  expect(last).toContain('CHAMPION');
  expect(last).toContain('399');
  expect(last).toContain('href="/#pricing"');
});

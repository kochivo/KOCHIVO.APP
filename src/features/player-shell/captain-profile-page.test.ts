import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainProfileCard, subscriptionProgress } from './components/captain-profile-card';
import { CaptainProfileScreen } from './components/captain-profile-screen';
import type { MyCaptain } from './data/my-captain';

const state = vi.hoisted(() => ({ data: null as MyCaptain | null, status: 'ready' }));
vi.mock('./hooks/use-my-captain', () => ({ useCaptainContext: () => ({ ...state, retry: vi.fn() }) }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-13T12:00:00Z') }) }));
vi.mock('next/dynamic', () => ({ default: () => () => createElement('section', null,
  createElement('button', { type: 'button' }, 'Renewal flow')) }));
const captain: MyCaptain = { fullName: 'Real coach', phone: '+201012345678', startedOn: '2026-11-01',
  accessUntil: '2026-12-04', archivedAt: null, location: 'Cairo', bio: 'Coach bio', social: { instagram: 'https://instagram.com/coach' } };
const render = (page = false) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
  createElement(page ? CaptainProfileScreen : CaptainProfileCard)));
beforeEach(() => { state.data = { ...captain }; state.status = 'ready'; });
it('uses calendar days in the player timezone and clamps subscription progress', () => {
  expect(subscriptionProgress(captain, new Date('2026-11-13T22:30:00Z'), 'Africa/Cairo')).toEqual({ daysLeft: 20, percent: 100 * 13 / 33 });
  expect(subscriptionProgress(captain, new Date('2027-01-01T00:00Z'), 'UTC')).toEqual({ daysLeft: 0, percent: 100 });
  expect(subscriptionProgress({ ...captain, startedOn: null }, new Date('2026-11-13T00:00Z'), 'UTC').percent).toBeNull();
  expect(subscriptionProgress({ ...captain, startedOn: '2026-12-04' }, new Date('2026-11-13T00:00Z'), 'UTC').percent).toBe(0);
});
it('preserves the legacy card identity, links, dates and WhatsApp action', () => {
  const html = render();
  for (const text of ['Real coach', 'Cairo', 'Coach bio', 'https://instagram.com/coach', 'https://wa.me/201012345678', '2026-12-04']) expect(html).toContain(text);
  expect(html).toContain('control-primary');
});
it('renders the page header, subscription, renewal and outline WhatsApp', () => {
  const html = render(true);
  expect(html).toContain('الكابتن واشتراكك');
  expect(html).toContain('/ar/player/captain');
  expect(html).toContain('Renewal flow');
  expect(html).toContain('فاضل 21 يوم');
  expect(html).toContain('<progress');
  expect(html).toContain('كلّم الكابتن على واتساب');
});
it('shows waiting without a ticking countdown or progress bar', () => {
  state.data = { ...captain, awaitingPlansAt: '2026-11-01T10:00:00Z' };
  const html = render(true);
  expect(html).toContain('مستني الأنظمة');
  expect(html).not.toContain('فاضل 21 يوم');
  expect(html).not.toContain('<progress');
});
it.each([{ pending: true }, { archivedAt: '2026-11-01T00:00Z' }])('hides renewal for %j', flags => {
  state.data = { ...captain, ...flags };
  expect(render(true)).not.toContain('Renewal flow');
});
it('disables WhatsApp without a valid contact', () => {
  state.data = { ...captain, phone: null, social: { whatsapp: 'javascript:alert(1)' } };
  expect(render()).toContain('disabled');
  expect(render(true)).toContain('الكابتن لسه محطش رقمه');
  expect(render(true)).not.toContain('javascript:');
});
it('reuses loading, error and no-captain states', () => {
  state.data = null; state.status = 'loading';
  expect(render(true)).toContain('role="status"');
  state.status = 'error';
  expect(render(true)).toContain('مش قادرين نحمّل بيانات الكابتن');
  state.status = 'ready';
  expect(render(true)).toContain('إنت مش متابع مع كابتن دلوقتي');
  expect(render(true)).not.toContain('Renewal flow');
});

it('uses the in-app conversation when Workspace has no WhatsApp number', () => {
  state.data = { ...captain, captainId: 'captain', phone: null };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(CaptainProfileCard, { variant: 'workspace' })));
  expect(html).toContain('href="/en/player/captain"');
  expect(html).toContain('Message your coach here');
  expect(html).not.toContain('<button disabled');
});

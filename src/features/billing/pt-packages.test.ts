import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlayerWaitingRoom } from './components/player-waiting-room';
import { ActivateSheet } from './components/activate-sheet';
import { balanceLabel } from './balance';
import { renewalPreview } from './renew';

const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
it('explains pending approval and frozen balances', () => {
  const waiting = render(createElement(PlayerWaitingRoom));
  expect(waiting).toContain('Your details reached the coach; waiting for approval and a package.');
  expect(waiting).toContain('role="status"');
  const frozen = render(createElement(PlayerWaitingRoom, { frozen: true }));
  expect(frozen).toContain('your days and sessions are saved');
  expect(frozen).toContain('text-water');
});
it('names the activation dialog and all its controls', () => {
  const html = render(createElement(ActivateSheet, { packages: [], onClose() {}, onSave() {} }));
  expect(html).toContain('aria-labelledby="activate-title"');
  expect(html).toContain('id="activate-title"');
  for (const label of ['Package type', 'Quantity', 'Price (EGP)', 'Paid (EGP)', 'Free trial', 'Activate player']) expect(html).toContain(label);
  expect(html).toContain('aria-label="Close"');
  expect(html).toContain('sheet fixed');
});
it('labels balances using Cairo dates, including a frozen midnight boundary', () => {
  const balance = { id: 'link', pending: false, sessions_left: null, frozen_at: null, access_until: '2026-11-15' };
  expect(balanceLabel(balance, '2026-11-03', 'en')).toBe('12 days left');
  expect(balanceLabel(balance, balance.access_until, 'en')).toBe('Ends today');
  expect(balanceLabel(balance, '2026-11-14', 'en')).toBe('Ends tomorrow');
  expect(balanceLabel({ ...balance, sessions_left: 7 }, '2026-11-03', 'en')).toBe('7 sessions left');
  expect(balanceLabel({ ...balance, pending: true }, '2026-11-03', 'en')).toBe('Awaiting activation');
  expect(balanceLabel({ ...balance, frozen_at: '2026-11-02T23:00:00Z' }, '2026-11-10', 'en')).toBe('12 days left');
});
it('previews top-ups without stacking validity windows', () => {
  expect(renewalPreview('2026-11-10', '2026-11-03', 60, 'sessions')).toEqual({ start: '2026-11-03', end: '2027-01-02' });
  expect(renewalPreview('2027-02-01', '2026-11-03', 60, 'sessions').end).toBe('2027-02-01');
});
it('shows waiting instead of a countdown or PT balance while plans are missing', () => {
  const balance = { id: 'link', pending: false, sessions_left: null, frozen_at: null,
    access_until: '2026-11-15', awaiting_plans_at: '2026-11-01T10:00:00Z' };
  expect(balanceLabel(balance, '2026-11-03', 'en')).toBe('Waiting for plans');
  expect(balanceLabel({ ...balance, sessions_left: 7 }, '2026-11-20', 'en')).toBe('Waiting for plans');
});

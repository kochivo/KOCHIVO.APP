import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { InboxScreen } from './components/inbox-screen';
import { CheckinDetail } from './components/checkin-detail';
import { ageLabel, quickReplies } from './merge';
vi.mock('./data/inbox', () => ({ listInbox: vi.fn(), reviewItem: vi.fn(), mediaUrls: vi.fn() }));
it('renders English inbox controls and loading text', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(InboxScreen)));
  expect(html).toContain('Inbox');
  expect(html).toContain('Loading inbox');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

it('renders English check-in measurements and loading text', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(CheckinDetail, {
    item: { kind: 'checkin', id: 'checkin', player_name: 'Ali', created_at: '2026-11-03T12:00:00Z',
      week_start: '2026-11-01', body_weight_kg: 80, waist_cm: null, notes: null, reviewed_at: null, reply: null },
  })));
  expect(html).toContain('Week of 1 November');
  expect(html).toContain('Weight');
  expect(html).toContain('Loading photos');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

it('uses English relative-time plurals and quick replies', () => {
  const now = new Date('2026-11-03T12:00:00Z');
  expect(ageLabel('2026-11-03T11:00:00Z', now, 'en')).toBe('1 hour ago');
  expect(ageLabel('2026-11-03T09:00:00Z', now, 'en')).toBe('3 hours ago');
  expect(ageLabel('2026-11-01T12:00:00Z', now, 'en')).toBe('2 days ago');
  expect(quickReplies('form', 'en')[0]).toBe('Great form');
});

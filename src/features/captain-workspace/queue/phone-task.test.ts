import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PhoneTaskCard } from './phone-task-card';
import type { CaptainTask } from './tasks-model';

vi.mock('server-only', () => ({}));

it('shows the selected check-in, its facts and note, and one approve-and-reply action', () => {
  const task: CaptainTask = {
    id: 'checkin:c', playerId: 'p', name: 'Sara', kind: 'checkin', at: '2026-11-18T10:00:00Z',
    item: { id: 'c', player_id: 'p', player_name: 'Sara', created_at: '2026-11-18T10:00:00Z',
      reviewed_at: null, reply: null, kind: 'checkin', week_start: '2026-11-14', body_weight_kg: 64.2,
      waist_cm: null, notes: 'My knee feels better' },
  };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(PhoneTaskCard, {
    task, at: '2026-11-18T12:00:00Z', triage: { history: [], dailyChecks: [] }, pending: false, canMove: true,
    onNext: () => {}, onAction: () => {}, onReview: () => {}, onSend: async () => true,
  })));
  expect(html).toContain('Sara');
  expect(html).toContain('64.2');
  expect(html).toContain('My knee feels better');
  expect(html).toContain('2 hours ago');
  expect(html).toContain('Approve and reply');
  expect(html.match(/control-primary/g)).toHaveLength(1);
});

import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceRoster } from './roster';
import type { RosterResult } from '../types';

const state = vi.hoisted(() => ({ filter: 'active', error: false, result: { players: [{ playerId: 'p', fullName: 'Ali',
  accessUntil: '2026-12-12', startedOn: '2026-11-01', lastTrainingDate: '2026-11-12', programTitle: 'Full body', openTasks: 2 }] } as RosterResult,
  index: 0 }));
vi.mock('react', async original => ({ ...await original<typeof React>(), use: () => [state.result, 'Captain'],
  useState: (initial: unknown) => [state.index++ === 0 ? state.filter : initial, () => {}],
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/features/demo', () => ({ useDemoExpiry: () => null }));
vi.mock('../data/archive-player', () => ({ archivePlayer: vi.fn() }));
beforeEach(() => { state.index = 0; state.filter = 'active'; });
function render(requests: { id: string; full_name: string; created_at: string }[] = [], error = false) {
  state.index = 0;
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(WorkspaceRoster, {
    today: '2026-11-12', data: Promise.resolve<[RosterResult, string]>([state.result, 'Captain']),
    RequestList: ({ rows }) => createElement('ul', null, rows.map(row => createElement('li', { key: row.id }, row.full_name))),
    extras: error ? { error: true } : { free: 4, food: [], meta: {}, requests },
  })));
}
it('renders capacity, counted chips and an accessible full-row file link without old action links', () => {
  const html = render();
  expect(html).toContain('1 لاعب نشط · 4 أماكن فاضية في باقتك');
  for (const label of ['نشطين', 'محتاج برنامج', 'متأخرين', 'اشتراكه هيخلص']) expect(html).toContain(label);
  expect(html).toContain('href="/captain/players/p"');
  expect(html).toContain('after:inset-0');
  expect(html).toContain('مفيش نظام أكل لسه');
  expect(html).not.toContain('href="/captain/players/p/programs"');
  expect(html).not.toContain('href="/captain/players/p/nutrition"');
  expect(html).toContain('href="/captain/players/p/preview"');
});
it('hides the requests chip with zero requests and replaces the table for a selected request filter', () => {
  expect(render()).not.toContain('طلبات انضمام');
  const requests = [{ id: 'r', full_name: 'Mona', created_at: '2026-11-12' }];
  expect(render(requests)).toContain('طلبات انضمام');
  state.filter = 'requests';
  const html = render(requests);
  expect(html).toContain('Mona');
  expect(html).not.toContain('role="table"');
  expect(render()).not.toContain('role="table"');
});
it('shows a retryable metadata error instead of invented capacity or nutrition status', () => {
  const html = render([], true);
  expect(html).toContain('role="alert"'); expect(html).toContain('جرّب تاني');
  expect(html).not.toContain('role="table"');
});
it('retains the existing clear-search-and-filter action for an empty result', () => {
  state.filter = 'needsProgram';
  expect(render()).toContain('امسح البحث والفلتر');
});

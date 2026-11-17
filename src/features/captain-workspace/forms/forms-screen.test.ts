import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { FormsScreen } from './forms-screen';
import type { PlayerForm } from './adapter';

const mocks = vi.hoisted(() => ({ resource: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: mocks.resource }));
vi.mock('./data/actions', () => ({ listPlayerForms: vi.fn() }));
const form: PlayerForm = { snapshot: { source: { kind: 'intake', id: 'player', at: '2026-11-11T12:00:00Z' }, facts: { weight: 82 } },
  comparison: [{ key: 'weight', value: 82, direction: 'new' }], reviewedAt: null, reply: null, photoCount: 0, bodyFat: null };
const props = { playerId: 'player', locale: 'en' as const, review: vi.fn(), sign: vi.fn() };
beforeEach(() => vi.clearAllMocks());
it.each(['loading', 'error', 'empty'] as const)('renders the asynchronous %s state', kind => {
  mocks.resource.mockReturnValue({ data: kind === 'empty' ? [] : undefined, status: kind === 'empty' ? 'ready' : kind, retry: vi.fn() });
  const html = renderToStaticMarkup(createElement(FormsScreen, props));
  expect(html).toContain(kind === 'loading' ? 'Loading assessments' : kind === 'empty' ? 'No assessments yet' : 'Could not load assessments');
});
it('shows the newest detail on desktop and waits for a tap on phones', () => {
  mocks.resource.mockReturnValue({ data: [form], status: 'ready', mutate: vi.fn(), retry: vi.fn() });
  const html = renderToStaticMarkup(createElement(FormsScreen, props));
  expect(html).toContain('hidden min-[760px]:block');
  expect(html).toContain('Select an assessment to see its answers');
  expect(html).toContain('player-form-detail');
  expect(html).toContain('82 kg');
});

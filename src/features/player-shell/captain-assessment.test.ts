import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainPendingAssessment } from './components/captain-pending-assessment';

const state = vi.hoisted(() => ({ rows: [] as { id: string; sent_at: string; answered_at: string | null;
  forms: { title: string }; questionCount: number | null }[] }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ status: 'ready', data: state.rows }) }));
vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: 'player' }) }));
afterEach(() => { state.rows = []; });
const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(CaptainPendingAssessment)));

it('links the pending banner to assessments and preserves the real question estimate in its title', () => {
  state.rows = [
    { id: 'new', sent_at: '2026-11-12T10:00Z', answered_at: null, forms: { title: 'New form' }, questionCount: 2 },
    { id: 'old', sent_at: '2026-11-01T10:00Z', answered_at: null, forms: { title: 'Weekly form' }, questionCount: 5 },
  ];
  const html = render();
  expect(html).toContain('/ar/player/assessments');
  expect(html).toContain('عندك تقييم مطلوب');
  expect(html).toContain('5 أسئلة · حوالي 2 دقايق');
  expect(html).not.toContain('New form');
});
it('hides the assessment card when no unanswered requests exist', () => {
  expect(render()).toBe('');
});

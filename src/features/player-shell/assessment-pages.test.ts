import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlayerAssessments } from './components/player-assessments';
import type { PlayerAssessmentHistory } from './data/player-assessments';

const state = vi.hoisted(() => ({ status: 'ready', data: { due: [], past: [] } as PlayerAssessmentHistory | undefined }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ status: state.status,
  data: state.data, retry: vi.fn() }) }));
vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: 'player' }) }));
const render = (layout: 'page' | 'link' | 'home' = 'page', actionable = true) => renderToStaticMarkup(
  createElement(LocaleProvider, { locale: 'ar' }, createElement(PlayerAssessments, { layout, actionable })));
beforeEach(() => { state.status = 'ready'; state.data = { due: [], past: [] }; });
it('renders separate empty due and past sections', () => {
  expect(render()).toContain('مطلوب منك');
  expect(render()).toContain('اللي سجلته قبل كده');
  expect(render()).toContain('مفيش تقييمات مطلوبة دلوقتي');
  expect(render()).toContain('لسه مسجلتش تقييمات');
});
it('renders due fill links and a real dated past headline with only one primary action', () => {
  state.data = { due: [{ id: 'one', due_at: null, forms: { title: 'First' } }, { id: 'two', due_at: null, forms: { title: 'Second' } }],
    past: [{ id: 'past', answered_at: '2026-11-10T12:00:00Z', forms: { title: 'Monthly' }, headline: { value: 82.4, labelAr: 'الوزن', labelEn: 'Weight' } }] };
  const html = render();
  expect(html).toContain('/ar/player/forms/one');
  expect(html).toContain('/ar/player/forms/two');
  expect(html).toContain('Monthly');
  expect(html).toContain('82.4');
  expect(html).toContain('2026-11-10T12:00:00Z');
  expect(html.match(/bg-lime /g)).toHaveLength(1);
  expect(render('page', false)).not.toContain('bg-lime ');
});
it('keeps the progress row linked during loading and adds the real due count when ready', () => {
  state.data = undefined; state.status = 'loading';
  expect(render('link')).toContain('/ar/player/assessments');
  state.status = 'ready'; state.data = { due: [{ id: 'one', due_at: null, forms: { title: 'First' } }], past: [] };
  expect(render('link')).toContain('bg-gold-2/10');
  expect(render('link')).toContain('تقييماتي');
});
it('handles loading and errors and keeps home assessment navigation on the new page', () => {
  state.data = undefined; state.status = 'loading';
  expect(render()).toContain('role="status"');
  state.status = 'error';
  expect(render()).toContain('مش قادرين نحمّل التقييمات');
  state.status = 'ready'; state.data = { due: [], past: [] };
  expect(render('home')).toContain('مفيش تقييمات مطلوبة دلوقتي');
  state.data.due.push({ id: 'one', due_at: null, forms: { title: 'First' } });
  expect(render('home')).toContain('/ar/player/assessments');
  expect(render('home')).not.toContain('/player/forms/');
  expect(render('home')).not.toContain('bg-lime ');
});

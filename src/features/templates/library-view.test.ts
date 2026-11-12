import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { LibraryView } from './components/library-view';
import type { LibraryTemplate } from './library-types';

const actions = () => ({ onOpen() {}, onPreview() {}, onAssign() {}, onCopy() {}, onRename() {}, onDelete() {}, onArchive() {} });
function render(kind: 'program' | 'nutrition', templates: LibraryTemplate[], locale: 'ar' | 'en' = 'ar') {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(LibraryView, {
    kind, templates, loading: false, error: '', createError: '', creating: false, busy: [], errors: {},
    onCreate() {}, onRetry() {}, actions,
  })));
}
const template: LibraryTemplate = { id: 'template', title: 'Push Pull Legs', kind: 'program', count: 3,
  created_at: '2026-11-12', starter: false, uses: 2, level: 'beginner', minutes: 30, place: 'gym' };
it('renders the approved training labels and retains every menu action', () => {
  const html = render('program', [template]);
  for (const text of ['خطط التمارين', 'خططك الجاهزة. تستخدمها لأي لاعب وتعدّل عليها', 'خطة جديدة', 'الكل', 'مبتدئ', 'متوسط', 'متقدم', 'دوّر على خطة', 'افتح', 'أرشف', 'معاينة']) expect(html).toContain(text);
  expect(html.match(/primary-surface/g)).toHaveLength(1);
  expect(html).toContain('Push Pull Legs');
});
it('renders one creation button and a short empty line for meal plans', () => {
  const html = render('nutrition', []);
  expect(html.match(/نظام جديد/g)).toHaveLength(1);
  expect(html).toContain('لسه معملتش نظام');
  expect(html).not.toContain('دوّر على خطة');
});
it('renders meal rows with real protein and usage, with no inferred training metadata', () => {
  const html = render('nutrition', [{ ...template, kind: 'nutrition', protein: 150, split: true }], 'en');
  expect(html).toContain('3 meals · 150 protein · Training and rest days');
  expect(html).toContain('With 2 players');
  expect(html).not.toContain('30 minutes');
});

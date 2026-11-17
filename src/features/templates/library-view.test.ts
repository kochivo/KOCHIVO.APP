import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { LibraryView } from './components/library-view';
import type { LibraryTemplate } from './library-types';
import { messages } from './messages';
import { createT } from '@/core/i18n/messages';

vi.mock('@/ui/page-bar-actions', () => ({ PageBarActions: ({ children }: { children: ReactNode }) => children }));

const actions = () => ({ onOpen() {}, onPreview() {}, onAssign() {}, onCopy() {}, onRename() {}, onDelete() {}, onArchive() {} });
afterEach(() => vi.unstubAllEnvs());
it('uses the engraved add action only with the workspace flag', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const legacy = render('program', []);
  expect(legacy).toContain('lucide-plus');
  expect(legacy).not.toContain('<pattern');
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const v6 = render('program', []);
  expect(v6).not.toContain('lucide-plus');
  const primary = v6.match(/<button[^>]*control-primary[^>]*>[\s\S]*?<\/button>/g);
  expect(primary).toHaveLength(1);
  expect(primary?.[0]).toContain('<pattern');
  expect(v6).toContain('role="radiogroup"');
});
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
  expect(html.match(/control-primary/g)).toHaveLength(1);
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
it('shows the load error and exactly one retry instruction', () => {
  const t = createT(messages, 'ar');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(LibraryView, {
    kind: 'program', templates: [], loading: false, error: t('couldntLoadTemplatesTryAgain'), createError: '',
    creating: false, busy: [], errors: {}, onCreate() {}, onRetry() {}, actions,
  })));
  expect(html).toContain('القوالب متحملتش');
  expect(html.match(/جرّب تاني/g)).toHaveLength(1);
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { LibraryCard } from './components/library-card';
import type { LibraryTemplate } from './library-types';

const template: LibraryTemplate = { id: 't', title: 'Push Pull Legs', kind: 'program', count: 3,
  created_at: '2026-11-12', starter: false, uses: 2, level: 'beginner', minutes: 30, place: 'gym' };
const props = { template, busy: false, error: '', onOpen() {}, onPreview() {}, onAssign() {}, onCopy() {}, onRename() {}, onDelete() {}, onArchive() {} };
const render = (kind: LibraryTemplate['kind']) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
  createElement(LibraryCard, { ...props, template: { ...template, kind } })));

it.each(['program', 'nutrition'] as const)('lifts the %s card with an open menu above its neighbours', kind => {
  const html = render(kind);
  expect(html).toMatch(/<li class="[^"]*relative[^"]*has-\[details\[open\]\]:z-20/);
});

it('draws the menu on a solid panel so rows behind it do not show through', () => {
  const panel = render('nutrition').match(/<summary[\s\S]*?<\/summary><div class="([^"]+)"/)?.[1] ?? '';
  expect(panel).toContain('bg-surface-raised');
  expect(panel).not.toMatch(/\bglass/);
});

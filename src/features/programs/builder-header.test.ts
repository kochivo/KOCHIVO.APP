import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { expect, it, vi } from 'vitest';
import { BuilderHeader } from './components/builder-header';

vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
vi.mock('@/features/templates', () => ({ SaveTemplateButton: () => null, templateMessages: {} }));

it('offers saving a template and hides activation without a player', () => {
  const html = renderToStaticMarkup(createElement(BuilderHeader, {
    draft: { id: 'template', player_id: null, title: 'Template', status: 'draft', days: [] },
    dirty: true, busy: false, onTitle() {}, onSave() {}, onActivate() {},
  }));
  expect(html).not.toContain('activateForPlayer');
  expect(html).toContain('saveTemplate');
});

it('reserves a full mobile row for the builder title and name', () => {
  const html = renderToStaticMarkup(createElement(BuilderHeader, {
    draft: { id: 'program', player_id: null, title: '', status: 'draft', days: [] },
    dirty: false, busy: false, onTitle: () => {}, onSave: () => {}, onActivate: () => {},
  }));
  expect(html).toMatch(/class="[^"]*basis-full[^"]*sm:basis-auto[^"]*"><h1/);
});

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { expect, it, vi } from 'vitest';
import { BuilderHeader } from './components/builder-header';

vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
vi.mock('@/features/templates', () => ({ SaveTemplateButton: () => null }));

it('reserves a full mobile row for the builder title and name', () => {
  const html = renderToStaticMarkup(createElement(BuilderHeader, {
    draft: { id: 'program', player_id: null, title: '', status: 'draft', days: [] },
    dirty: false, busy: false, onTitle: () => {}, onSave: () => {}, onActivate: () => {},
  }));
  expect(html).toMatch(/class="[^"]*basis-full[^"]*sm:basis-auto[^"]*"><h1/);
});

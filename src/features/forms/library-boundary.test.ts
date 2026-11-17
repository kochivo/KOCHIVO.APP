import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { FormsLibraryEntry } from './components/forms-library-entry';
import { LibraryList } from './components/library-list';
import { copyTemplate } from './model';
import { templates } from './templates';

vi.mock('./components/editor-session', () => { throw new Error('Editor loaded before opening a form'); });
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));

it('renders the initial library client entry without loading editor dependencies', () => {
  const markup = renderToStaticMarkup(createElement(FormsLibraryEntry, { form: null, locale: 'en' }, 'Server-rendered list'));
  expect(markup).toContain('Server-rendered list');
  expect(markup).not.toContain('Loading forms');
});

it('renders saved forms, recipient metrics and template links on the server without opening an editor', () => {
  const form = copyTemplate(templates[0], 'captain', () => 'form', 'en');
  const metrics = { active: 1, sent: 4, answered: 2, recipients: 3, averageHours: 2 };
  const markup = renderToStaticMarkup(createElement(LibraryList, {
    locale: 'en', data: { forms: [form], metrics, byForm: { form: metrics } },
  }));
  expect(markup).toContain('/en/captain/library/forms?edit=form');
  expect(markup).toContain('3');
  expect(markup).toContain('50%');
  expect(markup).toContain('text-warn');
  expect(markup).toContain('/en/captain/library/forms?template=progress');
});

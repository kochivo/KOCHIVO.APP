import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { SaveTemplateButton } from './components/save-template-button';

vi.mock('./data/templates', () => ({ saveAsTemplate: vi.fn() }));

it('offers saving a template in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(SaveTemplateButton, {
    kind: 'program', id: 'program', title: 'Strength',
  })));
  expect(html).toContain('Save as template');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

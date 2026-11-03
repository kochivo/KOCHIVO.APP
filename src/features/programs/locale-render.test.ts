import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { DayEditor } from './components/day-editor';

it('renders the day editor in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(DayEditor, {
    day: { id: 'day', program_id: 'program', title: 'Day 1', position: 1, exercises: [] }, update() {},
  })));
  expect(html).toContain('Day name');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

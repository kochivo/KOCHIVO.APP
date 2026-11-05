import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { RestPanel } from './components/rest-panel';
import { PrBurst } from './components/pr-burst';
import { restAnnouncement } from './rest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { DonePanel } from './components/done-panel';

it('renders workout in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(DonePanel, {})));
  expect(html).toContain('Workout complete');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});

it('translates rest controls, announcements and record dismissal', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement('div', null,
      createElement(RestPanel, { remaining: 3, flashing: true, onExtend: () => undefined, onSkip: () => undefined }),
      createElement(PrBurst, { pr: { kind: 'weight', previous: { weight_kg: 20, reps: 8 }, current: { weight_kg: 25, reps: 8 } }, onDismiss: () => undefined }))));
  expect(html).toContain('Rest time remaining');
  expect(html).toContain('Dismiss new record');
  expect(html).toContain('dir-icon');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
  expect(restAnnouncement(0, true, createT(messages, 'en'))).toBe('Rest finished');
});


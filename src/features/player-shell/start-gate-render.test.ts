import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { StartGateScreen } from './components/start-gate-screen';

it('shows real progress and links to the next pending answer, chat and settings', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(StartGateScreen, {
    captain: 'عمر', data: { name: 'علي', rows: [
      { id: 'done', title: 'الهدف', answered_at: '2026-11-03', blocks_access: true },
      { id: 'next', title: 'المقاسات', answered_at: null, blocks_access: true },
    ] },
  })));
  expect(html).toContain('أهلًا علي'); expect(html).toContain('كابتن عمر');
  expect(html).toContain('خلصت 1 من 2');
  expect(html).toContain('value="1" max="2"');
  expect(html).toContain('href="/ar/player/forms/next"');
  expect(html).not.toContain('href="/ar/player/forms/done"');
  expect(html).toContain('href="/ar/player/captain"'); expect(html).toContain('href="/ar/player/settings"');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { FocusScreen } from './components/focus-entry';
import { HistoryScreen } from './components/history-entry';

it('shows an accessible loading state while each route loads its own screen', () => {
  for (const screen of [createElement(FocusScreen, { dayId: 'day' }), createElement(HistoryScreen, { playerId: 'player' })]) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, screen));
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading');
  }
});

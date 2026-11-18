import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceList } from './components/workspace-list';

it('announces filtered zero results and offers a reset', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(WorkspaceList, {
    attention: [], routine: [], selected: null, inputs: { history: [], dailyChecks: [] },
    now: new Date('2026-11-18T12:00:00Z'), onSelect() {}, onReset() {},
  })));
  expect(html).toMatch(/role="status"[^>]*>No matching follow-ups/);
  expect(html).toContain('Reset filters</button>');
});

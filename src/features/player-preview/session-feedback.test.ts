import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PreviewWeek } from './components/preview-week';
import { activityWeek } from './week';

it('shows feedback only for completed sessions and escapes note text', () => {
  const today = '2026-11-05';
  const sessions = [
    { id: 'a', training_date: today, completed_at: 'done', session_rpe: 9, player_note: '<script>pain</script>' },
    { id: 'b', training_date: today, completed_at: null, session_rpe: 10, player_note: 'unfinished note' },
    { id: 'c', training_date: today, completed_at: 'done', session_rpe: null, player_note: null },
  ];
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(PreviewWeek, { today, week: activityWeek(today, sessions, []), sessions })));
  expect(html).toContain('Session RPE 9 / 10');
  expect(html).toContain('&lt;script&gt;pain&lt;/script&gt;');
  expect(html).not.toContain('unfinished note');
  expect(html).not.toContain('Session RPE 10');
});

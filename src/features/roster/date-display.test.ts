import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { RosterRow } from './components/roster-row';
import { LocaleProvider } from '@/core/i18n/client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('./data/archive-player', () => ({ archivePlayer: vi.fn() }));

it('shows a date-only subscription without shifting its day', () => {
  const html = renderToStaticMarkup(createElement(RosterRow, {
    today: '2026-11-03', player: { playerId: 'p', fullName: 'علي', accessUntil: '2026-11-03',
      startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0 },
  }));
  expect(html).toContain('dateTime="2026-11-03">٣ نوفمبر ٢٠٢٦</time>');
});

it('renders subscription dates and roster actions in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(RosterRow, {
    today: '2026-11-03', player: { playerId: 'p', fullName: 'Ali', accessUntil: '2026-11-03',
      startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0 },
  })));
  expect(html).toContain('3 November 2026');
  expect(html).toContain('Programs');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

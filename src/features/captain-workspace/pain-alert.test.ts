import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { PainAlert } from './components/pain-alert';
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/client', () => ({ useT: (m: Parameters<typeof createT>[0]) => createT(m, 'en'), useLocale: () => 'en' }));
it('renders captain context, repeated pain warning and all four replies', () => {
  const report = { id: 'report', captain_id: 'captain', player_id: 'player', session_id: null, program_exercise_id: null,
    set_index: 3, area: 'knee_r' as const, severity: 5, kind: 'sharp' as const, side_view: 'front' as const,
    created_at: '2026-11-15T10:00:00Z', status: 'open' as const, reply: null, answered_at: null,
    player_name: 'Mona', exercise_name: 'Squat', repeat_count: 2 };
  const html = renderToStaticMarkup(createElement(PainAlert, { report,
    now: Date.parse('2026-11-15T10:05:00Z'), onAnswer: async () => {} }));
  for (const text of ['Mona', 'Squat', 'Right knee', '5 minutes ago', 'again this month', 'Reduce load 20%', 'Talk', 'Rest this region', 'Swap for 2 weeks']) expect(html).toContain(text);
});

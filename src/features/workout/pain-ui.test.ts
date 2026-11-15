import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { PainSheet } from './components/pain-sheet';
import { PainAfterSend } from './components/pain-after-send';
import { PainLoadHint } from './components/pain-load-hint';

vi.mock('@/core/i18n/client', () => ({ useT: (m: Parameters<typeof createT>[0]) => createT(m, 'en'), useLocale: () => 'en' }));
const report = { id: 'report', captain_id: 'captain', player_id: 'player', session_id: null, program_exercise_id: null,
  set_index: 3, area: 'knee_r' as const, severity: 5, kind: 'sharp' as const, side_view: 'front' as const,
  created_at: '2026-11-15T10:00:00Z', status: 'open' as const, reply: null, answered_at: null };
const noop = () => {};
it('renders the sheet with accessible body choices, severity and kind', () => {
  const html = renderToStaticMarkup(createElement(PainSheet, { onClose: noop, onSend: async () => {}, exercise: 'Squat' }));
  expect(html).toContain('Where does it hurt?');
  expect(html).toContain('Right knee');
  expect(html).toContain('How bad?');
  expect(html).toContain('Send to coach');
  expect(html).toContain('Sharp');
});
it('always shows the doctor note and exposes a swap only when safe', () => {
  const props = { report, exercise: 'Squat', onSkip: noop, onSwap: noop };
  const without = renderToStaticMarkup(createElement(PainAfterSend, props));
  expect(without).toContain("If it&#x27;s sharp or swollen, stop and see a doctor.");
  expect(without).not.toContain('Use the swap');
  const withSwap = renderToStaticMarkup(createElement(PainAfterSend, { ...props, alternative: 'Curl' }));
  expect(withSwap).toContain('Use the swap');
  expect(withSwap).toContain('Curl');
});
it('shows reduced targets and a skip action for rest, hiding expired hints', () => {
  const props = { today: '2026-11-15', weight: 80, onSkip: noop };
  const hint = { player_id: 'player', program_exercise_id: 'row', factor: 0.8, until: '2026-11-15' };
  expect(renderToStaticMarkup(createElement(PainLoadHint, { ...props, hint }))).toContain('80');
  expect(renderToStaticMarkup(createElement(PainLoadHint, { ...props, hint: { ...hint, factor: 0 } }))).toContain('Skip this exercise');
  expect(renderToStaticMarkup(createElement(PainLoadHint, { ...props, hint: { ...hint, until: '2026-11-14' } }))).toBe('');
});

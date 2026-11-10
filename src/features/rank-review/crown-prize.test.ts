import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { CrownPrizeEditor } from './components/crown-prize-editor';
import { canEditPrize, normalizePrize, persistPrize } from './data/save-crown-prize';
import { LeaderboardScreen } from './components/leaderboard-screen';

it.each(['ar', 'en'] as const)('renders empty, filled, editing and failed editor states in %s', locale => {
  const render = (prize: string | null, editing = false, error = false) => renderToStaticMarkup(createElement(CrownPrizeEditor,
    { locale, prize, editing, error, saving: false, onSave: async () => {} }));
  expect(render(null)).toContain(locale === 'ar' ? 'حط جايزة للتاج الشهر ده' : "Set a prize for this month&#x27;s crown");
  const filled = render('<b>Free</b>');
  expect(filled).toContain('&lt;b&gt;Free&lt;/b&gt;');
  expect(filled).toContain(locale === 'ar' ? 'عدّل الجايزة' : 'Edit prize');
  const editing = render('Free', true);
  expect(editing).toContain('maxLength="120"');
  expect(editing).toContain(locale === 'ar' ? 'حفظ' : 'Save');
  expect(editing).toContain(locale === 'ar' ? 'إلغاء' : 'Cancel');
  expect(editing).toContain('4 / 120');
  expect(render('Free', false, true)).toContain('role="alert"');
});

it('restricts edits to current and next Cairo month including year rollover', () => {
  const now = new Date('2026-11-30T22:30:00Z');
  expect(canEditPrize('2026-11-01', now)).toBe(false);
  expect(canEditPrize('2026-12-01', now)).toBe(true);
  expect(canEditPrize('2027-01-01', now)).toBe(true);
  expect(canEditPrize('2027-02-01', now)).toBe(false);
  expect(normalizePrize('  Free  ')).toBe('Free');
  expect(normalizePrize('   ')).toBe(null);
  expect(() => normalizePrize('x')).toThrow();
  expect(() => normalizePrize('x'.repeat(121))).toThrow();
});

it('offers editing for current/next month only and keeps errors visible after rollback', () => {
  const board = { now: new Date('2026-11-10T12:00:00Z'), rows: [], error: false,
    setMonth: () => {}, reload: () => {}, savePrize: async () => {}, prize: 'Free session', prizeError: true };
  for (const month of ['2026-11-01', '2026-12-01']) {
    const html = renderToStaticMarkup(createElement(LeaderboardScreen, { locale: 'en', board: { ...board, month } }));
    expect(html).toContain('Crown prize: Free session');
    expect(html).toContain('Could not save the prize');
    expect(html).toContain('Edit prize');
  }
  const past = renderToStaticMarkup(createElement(LeaderboardScreen, { locale: 'en', board: { ...board, month: '2026-10-01' } }));
  expect(past).not.toContain('Edit prize');
  expect(past).not.toContain('Crown prize:');
});

it('shows optimistic saves and deletions immediately and rolls back failed persistence', async () => {
  let visible: string | null = 'Old prize';
  let finish: (() => void) | undefined;
  const request = new Promise<void>(resolve => { finish = resolve; });
  const saving = persistPrize('New prize', visible, value => { visible = value; }, () => request);
  expect(visible).toBe('New prize');
  finish?.(); await saving;
  await expect(persistPrize(null, visible, value => { visible = value; }, async () => { throw new Error('offline'); })).rejects.toThrow('offline');
  expect(visible).toBe('New prize');
  await persistPrize(null, visible, value => { visible = value; }, async () => {});
  expect(visible).toBe(null);
});

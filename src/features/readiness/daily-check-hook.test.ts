import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { KochivoDB } from '@/core/offline';
import type * as Offline from '@/core/offline';
import { useDailyCheck } from './hooks/use-daily-check';

const db = new KochivoDB('readiness-hook-taps');
vi.mock('@/core/offline', async original => ({
  ...await original<typeof Offline>(), localDb: () => db,
}));

it('preserves rapid water taps and consecutive morning answers through the UI hook', async () => {
  vi.useFakeTimers({ now: Date.parse('2026-11-04T08:00:00Z'), toFake: ['Date'] });
  let save: ReturnType<typeof useDailyCheck>['save'] | undefined;
  function Probe() {
    save = useDailyCheck('player', '2026-11-04').save;
    return null;
  }
  try {
    renderToStaticMarkup(createElement(Probe));
    if (!save) throw new Error('Missing hook');
    await Promise.all([save({}, 250), save({}, 250), save({ sleep_hours: 8 }), save({ soreness: 2 })]);
    expect(await db.daily_checks.toArray()).toEqual([expect.objectContaining({ water_ml: 500, sleep_hours: 8, soreness: 2 })]);
  } finally { vi.useRealTimers(); await db.delete(); }
});

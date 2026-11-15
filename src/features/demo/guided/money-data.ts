import type { DemoState } from './state';

export function demoMoney(state: DemoState, names: string[]) {
  const rows = [
    ...(!state.paid ? [{ playerId: 'mohamed', name: names[0] ?? '', amount: 1000, reason: 'partial' as const, since: '2026-11-01', days: 14 }] : []),
    { playerId: 'hassan', name: names[7] ?? '', amount: 500, reason: 'partial' as const, since: '2026-11-01', days: 14 },
  ];
  return { rows, total: state.paid ? 500 : 1500, count: rows.length, unpriced: 0 };
}

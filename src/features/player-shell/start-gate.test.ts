import { expect, it } from 'vitest';
import { needsStartGate, gateApplies } from './start-gate';

it('gates only pending blocking requests', () => {
  expect(needsStartGate([{ blocks_access: true, answered_at: null }])).toBe(true);
  expect(needsStartGate([{ blocks_access: false, answered_at: null }])).toBe(false);
  expect(needsStartGate([{ blocks_access: true, answered_at: '2026-11-03' }])).toBe(false);
  expect(needsStartGate([])).toBe(false);
});
it('keeps answers, chat and settings reachable while gating training routes', () => {
  for (const path of ['/ar/player/forms/abc', '/player/settings', '/player/captain', '/player/chat']) expect(gateApplies(path)).toBe(false);
  for (const path of ['/player', '/player/program', '/player/food', '/player/workout/abc']) expect(gateApplies(path)).toBe(true);
});

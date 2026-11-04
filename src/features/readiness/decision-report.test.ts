import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { PlayerReadiness } from './components/player-readiness';
import type { Decision } from './score';

const state = vi.hoisted(() => ({ decision: 'rest' as Decision | null, effects: [] as (() => void)[] }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useEffect: (effect: () => void) => { state.effects.push(effect); },
}));
vi.mock('@/core/offline/use-today-decision', () => ({ useTodayDecision: () => state.decision }));
vi.mock('next/dynamic', () => ({ default: () => ({ rest, coachRest }: { rest: boolean; coachRest: boolean }) =>
  createElement('div', { 'data-rest': rest, 'data-coach-rest': coachRest }),
}));

it('reports coach rest and cleared decisions from the lazy readiness boundary', () => {
  const onDecisionChange = vi.fn();
  const render = () => renderToStaticMarkup(createElement(PlayerReadiness, {
    playerId: 'player', today: '2026-11-04', rest: false, onDecisionChange,
  }));
  expect(render()).toContain('data-coach-rest="true"');
  expect(onDecisionChange).not.toHaveBeenCalled();
  state.effects.splice(0).forEach(effect => effect());
  expect(onDecisionChange).toHaveBeenLastCalledWith('rest');
  state.decision = null;
  expect(render()).toContain('data-rest="false"');
  state.effects.splice(0).forEach(effect => effect());
  expect(onDecisionChange).toHaveBeenLastCalledWith(null);
});

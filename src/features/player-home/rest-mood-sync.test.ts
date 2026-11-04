import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { RestMoodSync } from './components/rest-mood-sync';

const state = vi.hoisted(() => ({ rest: true, effects: [] as (() => void)[] }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useEffect: (effect: () => void) => { state.effects.push(effect); },
}));
vi.mock('./hooks/use-rest-mood', () => ({ useRestMood: () => state.rest }));

it('reports mood changes after render without adding visible UI', () => {
  const onChange = vi.fn();
  expect(renderToStaticMarkup(createElement(RestMoodSync, { onChange }))).toBe('');
  expect(onChange).not.toHaveBeenCalled();
  state.effects.splice(0).forEach(effect => effect());
  expect(onChange).toHaveBeenLastCalledWith(true);
  state.rest = false;
  renderToStaticMarkup(createElement(RestMoodSync, { onChange }));
  state.effects.splice(0).forEach(effect => effect());
  expect(onChange).toHaveBeenLastCalledWith(false);
});

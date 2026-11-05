import { afterEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import { clampChip, useMusclePopover } from '../hooks/use-muscle-popover';

const harness = vi.hoisted(() => ({
  selection: null as unknown,
  effects: [] as (() => void | (() => void))[],
  bounds: { x: 20, y: 30, width: 300, height: 420 },
}));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useState: () => [harness.selection, (value: unknown) => { harness.selection = value; }],
  useRef: () => ({ current: { getBoundingClientRect: () => harness.bounds } }),
  useEffect: (effect: () => void | (() => void)) => { harness.effects.push(effect); },
}));
afterEach(() => { harness.selection = null; harness.effects = []; vi.unstubAllGlobals(); });

it('clamps the chip inside the map even at the edge of a narrow card', () => {
  expect(clampChip(299, 419, 300, 420)).toEqual({ x: 52, y: 340, width: 240 });
  expect(clampChip(-10, -10, 180, 250)).toEqual({ x: 8, y: 8, width: 164 });
});
it('opens by muscle, closes with Escape or an outside tap, and cleans up listeners', () => {
  const listeners = new Map<string, (event: unknown) => void>();
  class Target {
    constructor(private trigger: boolean) {}
    closest() { return this.trigger ? this : null; }
  }
  vi.stubGlobal('Element', Target);
  vi.stubGlobal('document', {
    addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler),
    removeEventListener: (name: string) => listeners.delete(name),
  });
  useMusclePopover().select('hamstrings', 170, 130);
  expect(harness.selection).toEqual({ key: 'hamstrings', kind: 'muscle', x: 52, y: 100, width: 240 });
  useMusclePopover();
  const cleanup = harness.effects.at(-1)?.();
  listeners.get('keydown')?.({ key: 'Enter' });
  expect(harness.selection).not.toBeNull();
  listeners.get('pointerdown')?.({ target: new Target(true) });
  expect(harness.selection).not.toBeNull();
  listeners.get('keydown')?.({ key: 'Escape' });
  expect(harness.selection).toBeNull();
  useMusclePopover().select('legs', 170, 300, 'region');
  expect(harness.selection).toEqual({ key: 'legs', kind: 'region', x: 52, y: 270, width: 240 });
  listeners.get('pointerdown')?.({ target: new Target(false) });
  expect(harness.selection).toBeNull();
  if (cleanup) cleanup();
  expect(listeners.size).toBe(0);
});

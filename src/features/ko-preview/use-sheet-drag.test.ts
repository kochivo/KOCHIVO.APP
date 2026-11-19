import type { PointerEvent } from 'react';
import type * as ReactModule from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSheetDrag } from './hooks/use-sheet-drag';

vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof ReactModule>(),
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, moved],
}));

const moved = vi.hoisted(() => vi.fn());
afterEach(() => { vi.unstubAllGlobals(); moved.mockClear(); });

it.each([
  { distance: 81, reduced: false, closes: true },
  { distance: 40, reduced: false, closes: false },
  { distance: 81, reduced: true, closes: true },
])('handles a $distance px drag with reduced motion $reduced', ({ distance, reduced, closes }) => {
  vi.stubGlobal('window', { matchMedia: (query: string) => ({ matches: query.includes('reduced-motion') && reduced }) });
  const close = vi.fn();
  const { handlers } = useSheetDrag(true, close);
  const event = {
    pointerId: 1, button: 0, isPrimary: true, target: { closest: () => null },
    currentTarget: { setPointerCapture() {} }, clientY: 20,
  } as unknown as PointerEvent<HTMLElement>;
  handlers.onPointerDown(event);
  handlers.onPointerMove({ ...event, clientY: 20 + distance });
  expect(close).not.toHaveBeenCalled();
  if (reduced) expect(moved).not.toHaveBeenCalled();
  else expect(moved).toHaveBeenCalledWith(distance);
  handlers.onPointerUp({ ...event, clientY: 20 + distance });
  expect(close).toHaveBeenCalledTimes(Number(closes));
});

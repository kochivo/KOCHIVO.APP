import { afterEach, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import type * as ReactModule from 'react';
import type { ReactElement } from 'react';
const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useRef: () => ({ current: null }),
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => {
    const i = state.cursor++;
    if (!(i in state.slots)) state.slots[i] = initial;
    return [state.slots[i], (value: unknown) => { state.slots[i] = value; }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
import { AudioPlayer } from './audio-player';
import { IconButton } from './icon-button';
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
afterEach(() => { state.slots = []; state.cursor = 0; vi.unstubAllGlobals(); });
it('replaces unsupported audio with a clear translated message', () => {
  const render = () => { state.cursor = 0; return AudioPlayer({ src: 'signed', mimeType: 'audio/webm', durationSeconds: 12,
    playLabel: 'play', pauseLabel: 'pause', formatTime: String }); };
  const audio = nodes(render()).find(node => node.type === 'audio');
  (audio?.props.ref as (element: object) => void)({ canPlayType: () => '' });
  const result = nodes(render());
  expect(result.some(node => node.props.children === 'unsupportedAudio')).toBe(true);
  expect(result.some(node => node.type === IconButton)).toBe(false);
});

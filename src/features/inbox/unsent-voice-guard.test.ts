import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react', () => ({ useEffect: (effect: () => void) => effect() }));
import { useUnsentVoiceGuard } from './hooks/use-unsent-voice-guard';
afterEach(() => vi.unstubAllGlobals());

it.each([false, true])('confirms history navigation and restores the inbox when accepted=%s', accepted => {
  const listeners = new Map<string, (event: object) => void>();
  const pushState = vi.fn();
  const state = { __NA: true, tree: 'inbox' };
  const confirm = vi.fn(() => accepted);
  vi.stubGlobal('window', { confirm, location: { href: 'https://app/captain/inbox' }, history: { state, pushState },
    addEventListener: (type: string, listener: (event: object) => void) => listeners.set(type, listener), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  useUnsentVoiceGuard(true, false, 'unsent');
  const stopImmediatePropagation = vi.fn();
  expect(listeners.has('popstate')).toBe(true);
  listeners.get('popstate')?.({ stopImmediatePropagation });
  expect(confirm).toHaveBeenCalledWith('unsent');
  if (accepted) expect(pushState).not.toHaveBeenCalled();
  else {
    expect(stopImmediatePropagation).toHaveBeenCalled();
    expect(pushState).toHaveBeenCalledWith(state, '', 'https://app/captain/inbox');
  }
});

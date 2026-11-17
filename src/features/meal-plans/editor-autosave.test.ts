import { afterEach, expect, it, vi } from 'vitest';
import { useEditorAutosave } from './hooks/use-editor-autosave';
const effects = vi.hoisted(() => ({ run: undefined as undefined | (() => void | (() => void)) }));
vi.mock('react', () => ({ useEffect: (run: () => void | (() => void)) => { effects.run = run; } }));
afterEach(() => vi.useRealTimers());
it('debounces existing save and cancels pending work on a new edit', async () => {
  vi.useFakeTimers();
  const persist = vi.fn();
  useEditorAutosave({ dirty: true, busy: false, error: '', persist });
  const cleanup = effects.run?.();
  await vi.advanceTimersByTimeAsync(1499);
  expect(persist).not.toHaveBeenCalled();
  cleanup?.();
  await vi.advanceTimersByTimeAsync(1);
  expect(persist).not.toHaveBeenCalled();
  effects.run?.();
  await vi.advanceTimersByTimeAsync(1500);
  expect(persist).toHaveBeenCalledWith();
});
it.each([{ dirty: false, busy: false, error: '' }, { dirty: true, busy: true, error: '' }, { dirty: true, busy: false, error: 'failed' }])('does not save clean, busy or failed state', async state => {
  vi.useFakeTimers();
  const persist = vi.fn();
  useEditorAutosave({ ...state, persist });
  effects.run?.();
  await vi.runAllTimersAsync();
  expect(persist).not.toHaveBeenCalled();
});

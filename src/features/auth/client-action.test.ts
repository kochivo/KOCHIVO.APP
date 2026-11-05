import { afterEach, expect, it, vi } from 'vitest';
import { callAuthAction } from './data/client-action';

afterEach(() => vi.unstubAllGlobals());
it('clears role after successful sign-out, including password recovery', async () => {
  const removeItem = vi.fn();
  vi.stubGlobal('window', { localStorage: { removeItem } });
  await callAuthAction(async () => ({ error: 'failed' }));
  expect(removeItem).not.toHaveBeenCalled();
  await callAuthAction(async () => ({ redirect: '/captain' }));
  expect(removeItem).not.toHaveBeenCalled();
  await callAuthAction(async () => ({ redirect: '/login' }));
  expect(removeItem).toHaveBeenCalledWith('kochivo.role');
});

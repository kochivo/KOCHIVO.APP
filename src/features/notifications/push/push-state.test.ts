import { expect, it } from 'vitest';
import { initialPushState, pushReducer } from './push-state';

it('loads state then keeps the enabled state while a failed disable is retried', () => {
  const on = pushReducer(initialPushState, { type: 'loaded', on: true, denied: false });
  expect(on).toEqual({ on: true, denied: false, status: 'ready' });
  const saving = pushReducer(on, { type: 'saving' });
  expect(saving.status).toBe('saving');
  const failed = pushReducer(saving, { type: 'failed' });
  expect(failed).toEqual({ on: true, denied: false, status: 'error' });
  const loading = pushReducer(failed, { type: 'loading' });
  expect(loading.status).toBe('loading');
  expect(pushReducer(loading, { type: 'loaded', on: false, denied: false }).on).toBe(false);
});
it('shows permission denial and allows a later enable', () => {
  const denied = pushReducer(initialPushState, { type: 'loaded', on: false, denied: true });
  expect(denied.denied).toBe(true);
  expect(pushReducer(denied, { type: 'loaded', on: true, denied: false }))
    .toEqual({ on: true, denied: false, status: 'ready' });
});

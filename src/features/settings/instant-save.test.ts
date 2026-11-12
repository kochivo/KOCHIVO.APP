import { expect, it, vi } from 'vitest';
import { savePreference } from './instant-save';

it('applies instantly, reconciles the server response and reports saved quietly', async () => {
  let done: (value: { data: { units: string } }) => void = () => {};
  const request = new Promise<{ data: { units: string } }>(resolve => { done = resolve; });
  const update = vi.fn(), status = vi.fn();
  const task = savePreference({ units: 'metric' }, { units: 'imperial' }, update, status, () => request);
  expect(update).toHaveBeenLastCalledWith({ units: 'imperial' });
  expect(status).toHaveBeenLastCalledWith('saving');
  done({ data: { units: 'imperial' } }); await task;
  expect(status).toHaveBeenLastCalledWith('saved');
});
it.each(['result', 'throw'])('rolls back on %s failure and exposes the real error', async mode => {
  const update = vi.fn(), status = vi.fn();
  const commit = async () => { if (mode === 'throw') throw new Error('offline'); return { error: 'denied' }; };
  await expect(savePreference('old', 'new', update, status, commit)).rejects.toThrow(mode === 'throw' ? 'offline' : 'denied');
  expect(update.mock.calls).toEqual([['new'], ['old']]);
  expect(status).toHaveBeenLastCalledWith('error');
});

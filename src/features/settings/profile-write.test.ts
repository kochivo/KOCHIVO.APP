import { expect, it, vi } from 'vitest';
import { runProfileWrite } from './profile-write';

it('refuses an overlapping profile write and releases the shared lock after completion', async () => {
  const lock = { current: false };
  const pending = vi.fn();
  let finish = () => {};
  const saving = runProfileWrite(lock, pending, () => new Promise<void>(resolve => { finish = resolve; }));
  const editorSave = vi.fn(async () => {});
  expect(lock.current).toBe(true);
  expect(await runProfileWrite(lock, pending, editorSave)).toBe(false);
  expect(editorSave).not.toHaveBeenCalled();
  finish();
  expect(await saving).toBe(true);
  expect(lock.current).toBe(false);
  expect(await runProfileWrite(lock, pending, editorSave)).toBe(true);
  expect(editorSave).toHaveBeenCalledOnce();
  expect(pending.mock.calls).toEqual([[true], [false], [true], [false]]);
});
it('releases the lock when a write fails so the player can retry', async () => {
  const lock = { current: false };
  await expect(runProfileWrite(lock, () => {}, async () => { throw new Error('offline'); })).rejects.toThrow('offline');
  expect(lock.current).toBe(false);
  expect(await runProfileWrite(lock, () => {}, async () => {})).toBe(true);
});

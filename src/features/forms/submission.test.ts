import { expect,it,vi } from 'vitest';
import { submitDraft } from './data/submit-draft';
it('clears a draft only after confirmed writes and retains it on failure for retry',async () => {
  const clear = vi.fn();
  expect(await submitDraft(async () => ({ok:false}),clear)).toBe(false);
  expect(clear).not.toHaveBeenCalled();
  expect(await submitDraft(async () => {throw new Error('offline');},clear)).toBe(false);
  expect(clear).not.toHaveBeenCalled();
  expect(await submitDraft(async () => ({ok:true}),clear)).toBe(true);
  expect(clear).toHaveBeenCalledOnce();
});

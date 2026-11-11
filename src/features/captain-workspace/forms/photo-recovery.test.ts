import { expect, it } from 'vitest';
import { createPhotoRecovery } from './photo-recovery';

it('refreshes a failed thumbnail batch once and ignores other failures from the old batch', () => {
  const recovery = createPhotoRecovery();
  const old = ['old-front', 'old-side', 'old-back'];
  expect(recovery.failed(old)).toBe('refresh');
  expect(recovery.failed(old)).toBe('ignore');
  expect(recovery.failed(old)).toBe('ignore');
  expect(recovery.failed(['new-front', 'new-side', 'new-back'])).toBe('error');
  recovery.reset();
  expect(recovery.failed(['retry-front'])).toBe('refresh');
});

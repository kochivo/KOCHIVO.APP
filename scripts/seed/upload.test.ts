import type { SupabaseClient } from '@supabase/supabase-js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { uploadFile } from './upload';

const file = join(mkdtempSync(join(tmpdir(), 'seed-upload-')), 'a.gif');
writeFileSync(file, 'gif');

function client(exists: { data: boolean; error: unknown }, uploadError: unknown = null) {
  const upload = vi.fn(async () => ({ error: uploadError }));
  const storage = { exists: vi.fn(async () => exists), upload };
  // Test double: only storage.from(bucket).exists/upload are exercised.
  return { client: { storage: { from: () => storage } } as unknown as SupabaseClient, upload };
}

it('uploads when storage reports the object as missing with a not-found error', async () => {
  const { client: c, upload } = client({ data: false, error: { status: 404 } });
  expect(await uploadFile(c, 'exercise-media', 'a.gif', file, 'image/gif')).toBe('uploaded');
  expect(upload).toHaveBeenCalledOnce();
});

it('skips an object that already exists', async () => {
  const { client: c, upload } = client({ data: true, error: null });
  expect(await uploadFile(c, 'exercise-media', 'a.gif', file, 'image/gif')).toBe('skipped');
  expect(upload).not.toHaveBeenCalled();
});

it('fails when the upload itself fails', async () => {
  const { client: c } = client({ data: false, error: { status: 404 } }, { statusCode: '500' });
  await expect(uploadFile(c, 'exercise-media', 'a.gif', file, 'image/gif')).rejects.toThrow('Could not upload media: a.gif');
});

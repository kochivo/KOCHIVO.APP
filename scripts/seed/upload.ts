import { readFile } from 'node:fs/promises';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadFile(
  client: SupabaseClient,
  bucket: string,
  objectPath: string,
  localPath: string,
  contentType: string,
): Promise<'uploaded' | 'skipped'> {
  const storage = client.storage.from(bucket);
  // storage-js reports a missing object as { data: false, error } and throws on real failures,
  // so the error here only means not found. Treating it as a failure stopped every first seed.
  const existing = await storage.exists(objectPath);
  if (existing.data) return 'skipped';
  const { error } = await storage.upload(objectPath, await readFile(localPath), {
    contentType, upsert: false,
  });
  if (error) {
    // Another seed process may have uploaded the same object after our check.
    if (error.statusCode === '409' || error.statusCode === '400') {
      const recheck = await storage.exists(objectPath);
      if (recheck.data) return 'skipped';
    }
    throw new Error(`Could not upload media: ${objectPath}`);
  }
  return 'uploaded';
}

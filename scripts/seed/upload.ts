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
  const existing = await storage.exists(objectPath);
  if (existing.error) throw new Error(`Could not check media: ${objectPath}`);
  if (existing.data) return 'skipped';
  const { error } = await storage.upload(objectPath, await readFile(localPath), {
    contentType, upsert: false,
  });
  if (error) {
    // Another seed process may have uploaded the same object after our check.
    if (error.statusCode === '409' || error.statusCode === '400') {
      const recheck = await storage.exists(objectPath);
      if (!recheck.error && recheck.data) return 'skipped';
    }
    throw new Error(`Could not upload media: ${objectPath}`);
  }
  return 'uploaded';
}

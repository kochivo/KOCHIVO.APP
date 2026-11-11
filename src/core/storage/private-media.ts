import type { SupabaseClient } from '@supabase/supabase-js';
// Direct module import: the offline barrel would drag Dexie into every page that shows exercise media.
import { uuidv7 } from '@/core/offline/ids';
import type { AppDatabase as Database } from '@/types/app-database';

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3',
};

export async function uploadPrivateMedia(
  client: SupabaseClient<Database>, bucket: string, playerId: string, file: Blob,
): Promise<string> {
  const ext = extensions[file.type];
  if (!ext) throw new Error(`Unsupported media type: ${file.type}`);
  const path = `${playerId}/${uuidv7()}.${ext}`;
  const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Media upload failed');
  return path;
}

export async function signedMediaUrl(
  client: SupabaseClient<Database>, bucket: string, path: string, seconds = 600,
): Promise<string> {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, seconds);
  if (error || !data) throw new Error('Signing media URL failed');
  return data.signedUrl;
}

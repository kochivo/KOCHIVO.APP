import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import { compressImage } from '@/lib/compress-image';
import type { Translator } from '@/core/i18n/messages';
import type { messages } from '../messages';
import type { CaptainProfileInput } from '../schema';
import { saveCaptainProfile, saveProfile } from './settings';

export async function saveCaptainWithAvatar(input: CaptainProfileInput, file: File | null, t: Translator<typeof messages>) {
  return saveWithAvatar(input, file, t, saveCaptainProfile);
}

export async function savePlayerWithAvatar(input: { full_name: string; phone: string; avatar_path?: string | null; timezone?: string; timezone_auto?: boolean }, file: File | null, t: Translator<typeof messages>) {
  return saveWithAvatar(input, file, t, saveProfile);
}

async function saveWithAvatar<T extends { avatar_path?: string | null }>(
  input: T, file: File | null, t: Translator<typeof messages>, save: typeof saveProfile,
) {
  if (!file) return save(input);
  // Safari cannot encode WebP, so iPhones fall back to JPEG (the bucket accepts both).
  const blob = await compressImage(file, 256, 0.8, t, true, 'image/webp')
    .catch(() => compressImage(file, 256, 0.8, t, true, 'image/jpeg'));
  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : null;
  if (!extension || blob.size > 512 * 1024) throw new Error(t('photoFailed'));
  const client = await loadSupabaseBrowser();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error(t('photoFailed'));
  const path = `${auth.data.user.id}/${uuidv7()}.${extension}`;
  const bucket = client.storage.from('captain-avatars');
  const upload = await bucket.upload(path, blob, { contentType: blob.type, upsert: false });
  if (upload.error) throw new Error(t('photoFailed'));
  try {
    const result = await save({ ...input, avatar_path: path });
    if (result.fieldErrors) {
      await bucket.remove([path]).catch(() => undefined);
      return result;
    }
    if (result.error) throw new Error(result.error);
    return result;
  } catch (error) {
    await bucket.remove([path]).catch(() => undefined);
    throw error;
  }
}

export async function captainAvatarUrl(path: string) {
  const client = await loadSupabaseBrowser();
  return client.storage.from('captain-avatars').getPublicUrl(path).data.publicUrl;
}

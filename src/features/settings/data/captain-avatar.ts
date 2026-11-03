import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import { compressImage } from '@/lib/compress-image';
import type { Translator } from '@/core/i18n/messages';
import type { messages } from '../messages';
import type { CaptainProfileInput } from '../schema';
import { saveCaptainProfile } from './settings';

export async function saveCaptainWithAvatar(input: CaptainProfileInput, file: File | null, t: Translator<typeof messages>) {
  if (!file) return saveCaptainProfile(input);
  const blob = await compressImage(file, 256, 0.8, t, true, 'image/webp');
  if (blob.type !== 'image/webp' || blob.size > 512 * 1024) throw new Error(t('photoFailed'));
  const client = await loadSupabaseBrowser();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error(t('photoFailed'));
  const path = `${auth.data.user.id}/${uuidv7()}.webp`;
  const bucket = client.storage.from('captain-avatars');
  const upload = await bucket.upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (upload.error) throw new Error(t('photoFailed'));
  try {
    const result = await saveCaptainProfile({ ...input, avatar_path: path });
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

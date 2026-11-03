import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import { compressImage } from '@/lib/compress-image';
import type { Translator } from '@/core/i18n/messages';
import type { messages } from '../messages';
import type { CustomFoodInput, Food } from '../types';
import { createCustomFood } from './custom-food';

const BUCKET = 'captain-food-photos';

export async function uploadCustomFoodPhoto(
  client: Awaited<ReturnType<typeof loadSupabaseBrowser>>, captainId: string, file: File, t: Translator<typeof messages>,
): Promise<string> {
  const blob = await compressImage(file, 800, 0.8, t, true);
  if (blob.type !== 'image/jpeg' || blob.size > 1024 * 1024) throw new Error(t('photoFailed'));
  const key = `${captainId}/${uuidv7()}.jpg`;
  const upload = await client.storage.from(BUCKET).upload(key, blob, { contentType: 'image/jpeg', upsert: false });
  if (upload.error) throw new Error(t('photoFailed'));
  return `${BUCKET}/${key}`;
}

export async function saveCustomFood(input: CustomFoodInput, file: File | null, t: Translator<typeof messages>): Promise<Food> {
  if (!file) return createCustomFood(input);
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error(t('signInFirst'));
  const photoPath = await uploadCustomFoodPhoto(client, data.user.id, file, t);
  try {
    return await createCustomFood({ ...input, photoPath });
  } catch (error) {
    try {
      const removed = await client.storage.from(BUCKET).remove([photoPath.slice(BUCKET.length + 1)]);
      if (removed.error) throw removed.error;
    } catch { throw new Error(t('photoCleanupFailed')); }
    throw error;
  }
}

import { ok, fail } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import { compressImage } from '@/lib/compress-image';
import type { Translator } from '@/core/i18n/messages';
import type { messages } from '../messages';
import type { CustomFoodInput, Food } from '../types';
import { createCustomFood, updateCustomFood } from './custom-food';

const BUCKET = 'captain-food-photos';

export async function uploadCustomFoodPhoto(
  client: Awaited<ReturnType<typeof loadSupabaseBrowser>>, captainId: string, file: File, t: Translator<typeof messages>,
): Promise<ActionResult<string>> {
  let blob: Blob;
  try { blob = await compressImage(file, 800, 0.8, t, true); }
  catch { return fail(t('photoFailed')); }
  if (blob.type !== 'image/jpeg' || blob.size > 1024 * 1024) return fail(t('photoFailed'));
  const key = `${captainId}/${uuidv7()}.jpg`;
  const upload = await client.storage.from(BUCKET).upload(key, blob, { contentType: 'image/jpeg', upsert: false });
  if (upload.error) return fail(t('photoFailed'));
  return ok(`${BUCKET}/${key}`);
}

export async function saveCustomFood(input: CustomFoodInput, file: File | null, t: Translator<typeof messages>, id?: string): Promise<ActionResult<Food>> {
  const save = (value: CustomFoodInput) => id ? updateCustomFood(id, value) : createCustomFood(value);
  if (!file) return save(input);
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return fail(t('signInFirst'));
  const upload = await uploadCustomFoodPhoto(client, data.user.id, file, t);
  if (!upload.ok) return upload;
  const photoPath = upload.data;
  let result: ActionResult<Food>;
  try {
    result = await save({ ...input, photoPath });
  } catch { result = fail(t('couldntSaveTryAgain')); }
  if (result.ok) return result;
  try {
    const removed = await client.storage.from(BUCKET).remove([photoPath.slice(BUCKET.length + 1)]);
    return removed.error ? fail(t('photoCleanupFailed')) : result;
  } catch { return fail(t('photoCleanupFailed')); }
}

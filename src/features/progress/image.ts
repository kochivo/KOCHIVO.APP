import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';

const MAX_BYTES = 5 * 1024 * 1024;

export async function compressImage(file: File, maxSide = 1600, quality = 0.8, t: Translator<typeof messages> = createT(messages, 'ar')): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error(t('chooseAnImage'));
  if (!(maxSide > 0) || quality < 0 || quality > 1) throw new Error(t('invalidImageSettings'));
  let bitmap: ImageBitmap | undefined;
  try {
    if (typeof createImageBitmap === 'undefined') throw new Error('unsupported');
    bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    let blob: Blob | null;
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('unsupported');
      context.drawImage(bitmap, 0, 0, width, height);
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('unsupported');
      context.drawImage(bitmap, 0, 0, width, height);
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    }
    if (blob && ['image/jpeg', 'image/webp'].includes(blob.type) && blob.size <= MAX_BYTES) return blob;
  } catch {
    // Older browsers can still send a small image accepted by the private bucket.
  } finally {
    bitmap?.close();
  }
  if (file.size <= MAX_BYTES && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;
  throw new Error(t('imageIsTooLargeOrUnsupportedChoose'));
}

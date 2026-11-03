type ImageMessage = 'chooseAnImage' | 'invalidImageSettings' | 'imageIsTooLargeOrUnsupportedChoose';

export async function compressImage(
  file: File, maxSide: number, quality: number, t: (key: ImageMessage) => string, strict = false,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error(t('chooseAnImage'));
  if (!(maxSide > 0) || quality < 0 || quality > 1) throw new Error(t('invalidImageSettings'));
  let bitmap: ImageBitmap | undefined;
  try {
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
      blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    }
    if (blob && blob.type === 'image/jpeg' && blob.size <= 5 * 1024 * 1024) return blob;
  } catch {
    // Progress keeps its original fallback; food photos require resized JPEG output.
  } finally {
    bitmap?.close();
  }
  if (!strict && file.size <= 5 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;
  throw new Error(t('imageIsTooLargeOrUnsupportedChoose'));
}

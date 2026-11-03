import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';
import { compressImage as compress } from '@/lib/compress-image';

export function compressImage(file: File, maxSide = 1600, quality = 0.8, t: Translator<typeof messages> = createT(messages, 'ar')): Promise<Blob> {
  return compress(file, maxSide, quality, t);
}

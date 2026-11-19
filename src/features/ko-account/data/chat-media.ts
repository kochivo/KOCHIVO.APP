import type { KoMedia } from '@/features/ko-agent';
import type { KoRole } from '@/features/ko-core';

export const maxImage = 3_000_000;
const maxAudio = 1_000_000;
const audioTypes = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/wav']);
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function readChatMedia(
  file: FormDataEntryValue | null, photo: boolean, role: KoRole,
): Promise<{ media?: KoMedia; status?: never } | { status: 400 | 415; media?: never }> {
  if (file === null) return {};
  if (!(file instanceof File) || file.size <= 0 || file.size > (photo ? maxImage : maxAudio) ||
      (photo && role !== 'player')) return { status: 400 };
  const type = file.type.split(';', 1)[0] ?? '';
  if (!(photo ? imageTypes : audioTypes).has(type)) return { status: 415 };
  return { media: { data: new Uint8Array(await file.arrayBuffer()), mimeType: type === 'audio/mp4' ? 'audio/m4a' : type } };
}

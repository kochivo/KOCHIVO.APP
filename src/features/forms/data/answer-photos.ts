import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import { compressImage } from '@/lib/compress-image';
export class AnswerPhotoFitError extends Error {}
export async function uploadAnswerPhotos(player:string,request:string,files:FileList):Promise<string[]> {
  const client = await loadSupabaseBrowser();
  const paths:string[] = [];
  if (files.length > 10) throw new Error('photo limit');
  for (const file of Array.from(files)) {
    let blob: Blob;
    try {
      blob = await compressImage(file,1600,0.8,() => 'photo cannot fit');
    } catch { throw new AnswerPhotoFitError('photo cannot fit'); }
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `forms/${player}/${request}/${uuidv7()}.${extension}`;
    const result = await client.storage.from('checkin-photos').upload(path,blob,{contentType:blob.type});
    if (result.error) throw result.error;
    paths.push(path);
  }
  return paths;
}

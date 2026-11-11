import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
export async function uploadAnswerPhotos(player:string,request:string,files:FileList):Promise<string[]> {
  const client = await loadSupabaseBrowser();
  const paths:string[] = [];
  if (files.length > 10) throw new Error('photo limit');
  for (const file of Array.from(files)) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10*1024*1024) throw new Error('photo size or type');
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `forms/${player}/${request}/${uuidv7()}.${extension}`;
    const result = await client.storage.from('checkin-photos').upload(path,file,{contentType:file.type});
    if (result.error) throw result.error;
    paths.push(path);
  }
  return paths;
}

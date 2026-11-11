import { photoPose } from '../gallery';
import type { CheckIn } from './checkins';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';

export async function signGallery(rows: readonly CheckIn[], client: SupabaseClient<AppDatabase>) {
  const paths = rows.flatMap(row => row.photo_paths);
  const files = paths.length ? await client.storage.from('checkin-photos').createSignedUrls(paths, 600)
    .then(result => result.error ? [] : result.data ?? [], () => []) : [];
  const urls = new Map(files.flatMap(file => !file.error && file.path && file.signedUrl ? [[file.path, file.signedUrl] as const] : []));
  const weeks = rows.map(row => {
    return { date: row.week_start, weight: row.body_weight_kg,
      failed: row.photo_paths.some(path => !urls.has(path)),
      photos: row.photo_paths.flatMap((path, index) => {
        const url = urls.get(path);
        return url ? [{ url, pose: photoPose(row.photo_poses[index]) }] : [];
      }),
    };
  });
  return { weeks, failed: weeks.some(week => week.failed) };
}

import { photoPose } from '../gallery';
import type { CheckIn } from './checkins';

export async function signGallery(rows: readonly CheckIn[], sign: (path: string) => Promise<string>) {
  const weeks = await Promise.all(rows.map(async row => {
    const results = await Promise.allSettled(row.photo_paths.map(async (path, index) => ({
      url: await sign(path), pose: photoPose(row.photo_poses[index]),
    })));
    return { date: row.week_start, weight: row.body_weight_kg,
      failed: results.some(result => result.status === 'rejected'),
      photos: results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []),
    };
  }));
  return { weeks, failed: weeks.some(week => week.failed) };
}

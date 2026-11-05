import { publicEnv } from '@/core/config/env';

// The seed stores paths with their bucket ("exercise-media/0001.gif"); older rows may not.
function publicUrl(bucket: string, path: string): string {
  const key = path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURI(key)}`;
}

export function exerciseMediaUrl(path: string): string {
  return publicUrl('exercise-media', path);
}

export function foodMediaUrl(path: string): string {
  return publicUrl('food-media', path);
}

export function foodPhotoUrl(path: string): string {
  return path.startsWith('captain-food-photos/') ? publicUrl('captain-food-photos', path) : foodMediaUrl(path);
}

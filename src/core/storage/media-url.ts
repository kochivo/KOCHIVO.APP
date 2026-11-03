import { publicEnv } from '@/core/config/env';

export function exerciseMediaUrl(path: string): string {
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-media/${encodeURI(path)}`;
}

export { coachSlug } from '@/lib/coach-slug';
export function coachSignupHref(slug: string) {
  return `/login?tab=signup&coach=${encodeURIComponent(slug)}`;
}

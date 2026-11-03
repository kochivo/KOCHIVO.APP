import { coachSlug } from '@/lib/coach-slug';
export type AuthUser = { role: 'captain' | 'player'; roleConfirmed: boolean; suspended?: boolean; anonymous?: boolean };
export function decideRoute({ path, user, coach }: { path: string; user: AuthUser | null; coach?: string }): { redirect?: string } {
  if (user?.suspended) {
    return ['/suspended', '/sign-out', '/auth/sign-out', '/auth/callback'].includes(path) ? {} : { redirect: '/suspended' };
  }
  const captainArea = path === '/captain' || path.startsWith('/captain/');
  const playerArea = path === '/player' || path.startsWith('/player/');
  const home = user?.role === 'captain' ? '/captain' : '/player';
  if (captainArea || playerArea) {
    if (user?.anonymous && !user.roleConfirmed) return { redirect: '/demo' };
    if (!user || (user.role === 'captain' && !user.roleConfirmed)) return { redirect: '/login' };
    if (captainArea !== (user.role === 'captain')) return { redirect: home };
  }
  // Recovery code verification creates a session before password validation can be retried.
  if (user && (user.role === 'player' || user.roleConfirmed) && path === '/login' && !coachSlug(coach)) {
    return { redirect: home };
  }
  return {};
}

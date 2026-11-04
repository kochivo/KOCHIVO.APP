import { coachSlug } from '@/lib/coach-slug';
export type AuthUser = { role: 'captain' | 'player'; admin: boolean; roleConfirmed: boolean; suspended?: boolean; anonymous?: boolean; captainStatus?: 'pending' | 'approved' | 'rejected' };
export function homeFor(user: AuthUser): '/admin' | '/captain' | '/captain/pending' | '/player' {
  return user.admin ? '/admin' : user.role === 'captain'
    ? user.captainStatus && user.captainStatus !== 'approved' ? '/captain/pending' : '/captain' : '/player';
}
export function decideRoute({ path, user, coach }: { path: string; user: AuthUser | null; coach?: string }): { redirect?: string } {
  if (user?.suspended) {
    return ['/suspended', '/sign-out', '/auth/sign-out', '/auth/callback'].includes(path) ? {} : { redirect: '/suspended' };
  }
  const captainArea = path === '/captain' || path.startsWith('/captain/');
  const playerArea = path === '/player' || path.startsWith('/player/');
  if (user?.admin && (captainArea || playerArea || path === '/login')) return { redirect: homeFor(user) };
  const home = user ? homeFor(user) : '/login';
  if (captainArea || playerArea) {
    if (user?.anonymous && !user.roleConfirmed) return { redirect: '/demo' };
    if (!user || (user.role === 'captain' && !user.roleConfirmed)) return { redirect: '/login' };
    if (captainArea !== (user.role === 'captain')) return { redirect: home };
    if (captainArea && home === '/captain/pending' && path !== home) return { redirect: home };
    if (path === '/captain/pending' && home === '/captain') return { redirect: home };
  }
  // Recovery code verification creates a session before password validation can be retried.
  if (user && (user.role === 'player' || user.roleConfirmed) && path === '/login' && !coachSlug(coach)) {
    return { redirect: home };
  }
  return {};
}

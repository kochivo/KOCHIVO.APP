export type AuthUser = { role: 'captain' | 'player'; roleConfirmed: boolean; suspended?: boolean };
export function decideRoute({ path, user }: { path: string; user: AuthUser | null }): { redirect?: string } {
  if (user?.suspended) {
    return ['/suspended', '/sign-out', '/auth/sign-out', '/auth/callback'].includes(path) ? {} : { redirect: '/suspended' };
  }
  const captainArea = path === '/captain' || path.startsWith('/captain/');
  const playerArea = path === '/player' || path.startsWith('/player/');
  const home = user?.role === 'captain' ? '/captain' : '/player';
  if (captainArea || playerArea) {
    if (!user || (user.role === 'captain' && !user.roleConfirmed)) return { redirect: '/login' };
    if (captainArea !== (user.role === 'captain')) return { redirect: home };
  }
  if (user && (user.role === 'player' || user.roleConfirmed) && ['/login', '/forgot-password'].includes(path)) {
    return { redirect: home };
  }
  return {};
}

import { parseInviteCode } from '@/lib/invite-code';

import { isInstalledApp, type InstalledWindow } from '@/lib/installed-app';

export { isInstalledApp };

export function shouldWelcome(win: InstalledWindow, search: string): boolean {
  const params = new URLSearchParams(search);
  return isInstalledApp(win) && !['tab', 'coach', 'error'].some(key => params.has(key));
}

export function inviteDestination(input: string): string | null {
  let value = input.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const match = /^\/i\/([^/]+)\/?$/.exec(url.pathname);
      if (!match?.[1]) return null;
      value = match[1];
    } catch { return null; }
  }
  const code = parseInviteCode(value);
  return code ? `/i/${code}` : null;
}

export function welcomeAction<Action extends 'start' | 'player' | 'captain' | 'login'>(action: Action) {
  return ({ start: 2, player: 3, captain: '/login?tab=signup', login: '/login?tab=login' } as const)[action];
}

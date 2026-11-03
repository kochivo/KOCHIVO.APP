import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';

import { CreditCard, Files, Inbox, LayoutDashboard, Settings, Users } from 'lucide-react';

export const captainLinks = [
  { href: '/captain', label: 'home' as const, icon: LayoutDashboard },
  { href: '/captain/players', label: 'players' as const, icon: Users },
  { href: '/captain/inbox', label: 'tasks' as const, icon: Inbox },
  { href: '/captain/templates', label: 'templates' as const, icon: Files },
  { href: '/captain/billing', label: 'subscriptions' as const, icon: CreditCard },
  { href: '/captain/settings', label: 'settings' as const, icon: Settings },
];

export function captainNav(pathname: string, t: Translator<typeof messages> = createT(messages, 'ar')) {
  return captainLinks.map((link) => ({
    ...link, label: t(link.label),
    active: link.href === '/captain' ? pathname === '/captain'
      : link.href === '/captain/players'
        ? pathname === '/captain/players' || ['players', 'programs', 'nutrition'].some((section) => pathname.startsWith(`/captain/${section}/`))
        : pathname === link.href || pathname.startsWith(`${link.href}/`),
  }));
}

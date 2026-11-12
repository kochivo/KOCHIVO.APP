import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

import { BookOpen, CreditCard, Dumbbell, Inbox, LayoutDashboard, Settings, Users } from 'lucide-react';

export const captainLinks = [
  { href: '/captain', label: 'home' as const, icon: LayoutDashboard },
  { href: '/captain/players', label: 'players' as const, icon: Users },
  { href: '/captain/inbox', label: 'tasks' as const, icon: Inbox },
  { href: '/captain/templates', label: 'templates' as const, icon: Dumbbell },
  { href: '/captain/billing', label: 'subscriptions' as const, icon: CreditCard },
  { href: '/captain/settings', label: 'settings' as const, icon: Settings },
];

export function captainNav(pathname: string, t: Translator<typeof messages> = createT(messages, 'ar')) {
  const links: { href: string; label: string; icon: typeof BookOpen; active: boolean; group?: string }[] = captainLinks.map((link) => ({
    ...link, label: t(link.label),
    active: link.href === '/captain' ? pathname === '/captain'
      : link.href === '/captain/players'
        ? pathname === '/captain/players' || ['players', 'programs', 'nutrition'].some((section) => pathname.startsWith(`/captain/${section}/`))
        : pathname === link.href || pathname.startsWith(`${link.href}/`),
  }));
  if (!captainWorkspaceEnabled()) return links;
  links[3] = { ...links[3], href: '/captain/templates', label: t('trainingPlans'), icon: Dumbbell,
    active: pathname === '/captain/templates' || pathname.startsWith('/captain/templates/'), group: t('trainingGroup') };
  links.splice(4, 0, ...(['foods', 'forms'] as const).map(section => ({
    href: `/captain/library/${section}`, label: t(section), icon: BookOpen,
    group: t(section === 'foods' ? 'foodGroup' : 'followupGroup'),
    active: pathname === `/captain/library/${section}`,
  })));
  return links;
}

export function captainMobileNav(pathname: string, t: Translator<typeof messages> = createT(messages, 'ar')) {
  const destinations = ['/captain', '/captain/players', '/captain/templates', '/captain/inbox'];
  if (captainWorkspaceEnabled()) destinations.splice(3, 1, '/captain/library/foods');
  return captainNav(pathname, t)
    .filter(item => destinations.includes(item.href))
    .map(item => item.href === '/captain/library/foods'
      ? { ...item, label: t('foodGroup'), active: pathname.startsWith('/captain/library/foods') }
      : captainWorkspaceEnabled() && item.href === '/captain/templates' ? { ...item, label: t('trainingGroup') } : item)
    .sort((a, b) => destinations.indexOf(a.href) - destinations.indexOf(b.href));
}

import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

import { Apple, ClipboardCheck, CreditCard, Dumbbell, Inbox, LayoutDashboard, Salad, Settings, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const captainLinks = [
  { href: '/captain', label: 'home' as const, icon: LayoutDashboard },
  { href: '/captain/players', label: 'players' as const, icon: Users },
  { href: '/captain/inbox', label: 'tasks' as const, icon: Inbox },
  { href: '/captain/templates', label: 'templates' as const, icon: Dumbbell },
  { href: '/captain/billing', label: 'subscriptions' as const, icon: CreditCard },
  { href: '/captain/settings', label: 'settings' as const, icon: Settings },
];

export function captainNav(pathname: string, t: Translator<typeof messages> = createT(messages, 'ar')) {
  const links: { href: string; label: string; icon: LucideIcon; active: boolean; group?: string }[] = captainLinks.map((link) => ({
    ...link, label: t(link.label),
    active: link.href === '/captain' ? pathname === '/captain'
      : link.href === '/captain/players'
        ? pathname === '/captain/players' || ['players', 'programs', 'nutrition'].some((section) => pathname.startsWith(`/captain/${section}/`))
        : pathname === link.href || pathname.startsWith(`${link.href}/`),
  }));
  if (!captainWorkspaceEnabled()) return links;
  for (const link of links) {
    if (link.href === '/captain/players') link.label = t('workspacePlayers');
    if (link.href === '/captain/inbox') link.label = t('followupGroup');
  }
  links[3] = { ...links[3], href: '/captain/templates', label: t('trainingPlans'), icon: Dumbbell,
    active: pathname === '/captain/templates' || pathname.startsWith('/captain/templates/'), group: t('trainingGroup') };
  links.splice(4, 0, { href: '/captain/library/meal-plans', label: t('mealPlans'), icon: Salad,
    group: t('foodGroup'), active: pathname.startsWith('/captain/library/meal-plans') },
  { href: '/captain/library/foods', label: t('foods'), icon: Apple, active: pathname.startsWith('/captain/library/foods') },
  { href: '/captain/library/forms', label: t('forms'), icon: ClipboardCheck,
    group: t('administrationGroup'), active: pathname.startsWith('/captain/library/forms') });
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

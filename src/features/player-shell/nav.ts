import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { Home, MessageCircle, TrendingUp, Utensils } from 'lucide-react';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

function navItems(t: Translator<typeof messages>) { return [
  { href: '/player', label: t('home'), icon: Home },
  { href: '/player/nutrition', label: t(captainWorkspaceEnabled() ? 'v6Food' : 'nutrition'), icon: Utensils },
  { href: '/player/progress', label: t(captainWorkspaceEnabled() ? 'v6Progress' : 'progress'), icon: TrendingUp },
  { href: '/player/captain', label: t('coach'), icon: MessageCircle },
]; }

export function playerNav(pathname: string, locale: Locale = 'ar') {
  const items = navItems(createT(messages, locale));
  const active = items.filter(({ href }) => pathname === href ||
    (href !== '/player' && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return items.map((item) => ({ ...item, active: item.href === active }));
}

export function showsNav(pathname: string) {
  return pathname !== '/player/onboarding' && !pathname.startsWith('/player/onboarding/') &&
    pathname !== '/player/workout' && !pathname.startsWith('/player/workout/');
}

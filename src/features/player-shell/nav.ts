import { Home, MessageCircle, TrendingUp, Utensils } from 'lucide-react';

const items = [
  { href: '/player', label: 'الرئيسية', icon: Home },
  { href: '/player/nutrition', label: 'التغذية', icon: Utensils },
  { href: '/player/progress', label: 'التطور', icon: TrendingUp },
  { href: '/player/captain', label: 'الكابتن', icon: MessageCircle },
];

export function playerNav(pathname: string) {
  const active = items.filter(({ href }) => pathname === href ||
    (href !== '/player' && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return items.map((item) => ({ ...item, active: item.href === active }));
}

export function showsNav(pathname: string) {
  return pathname !== '/player/onboarding' && !pathname.startsWith('/player/onboarding/') &&
    pathname !== '/player/workout' && !pathname.startsWith('/player/workout/');
}

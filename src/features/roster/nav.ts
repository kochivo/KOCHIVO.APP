import { CreditCard, Inbox, Settings, Users } from 'lucide-react';

export const captainLinks = [
  { href: '/captain', label: 'اللاعبين', icon: Users },
  { href: '/captain/inbox', label: 'المهام', icon: Inbox },
  { href: '/captain/billing', label: 'الاشتراكات', icon: CreditCard },
  { href: '/captain/settings', label: 'الإعدادات', icon: Settings },
];

export function captainNav(pathname: string) {
  return captainLinks.map((link) => ({
    ...link,
    active: link.href === '/captain'
      ? pathname === '/captain' || ['players', 'programs', 'nutrition']
        .some((section) => pathname.startsWith(`/captain/${section}/`))
      : pathname === link.href || pathname.startsWith(`${link.href}/`),
  }));
}

export function mobileCaptainNav(pathname: string) {
  return captainNav(pathname);
}

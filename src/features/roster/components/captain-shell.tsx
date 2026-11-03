import Link from 'next/link';
import { Apple, CreditCard, Dumbbell, Files, Inbox, Settings, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/features/auth';
import { BottomNav } from '@/ui';

// TODO: Remaining destinations will be implemented by the later captain task cards.
const links = [
  { href: '/captain', label: 'اللاعبين', icon: Users, active: true },
  { href: '/captain/programs', label: 'البرامج', icon: Dumbbell },
  { href: '/captain/nutrition', label: 'الأنظمة الغذائية', icon: Apple },
  { href: '/captain/inbox', label: 'صندوق المهام', icon: Inbox },
  { href: '/captain/templates', label: 'القوالب', icon: Files },
  { href: '/captain/billing', label: 'الاشتراكات', icon: CreditCard },
  { href: '/captain/settings', label: 'الإعدادات', icon: Settings },
];
const mobileLinks = [links[0], links[1], { href: '/captain/inbox', label: 'المهام', icon: Inbox }, links[6]]
  .filter((item) => item !== undefined);

export function CaptainShell({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="mx-auto flex min-h-dvh max-w-screen-2xl gap-6 p-4 lg:p-6">
      <aside className="glass sticky top-6 hidden h-[calc(100dvh-3rem)] w-60 shrink-0 flex-col gap-6 rounded-card p-4 lg:flex">
        <Link href="/captain" className="flex min-h-12 items-center px-3 font-display text-2xl font-extrabold">KOCHIVO</Link>
        <nav aria-label="قائمة الكابتن" className="space-y-1">
          {links.map(({ href, label, icon: Icon, active }) => (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-control px-3 text-sm ${active ? 'glass-raised font-bold text-lime' : 'text-muted hover:text-ink'}`}>
              <Icon aria-hidden className="size-5" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto [&_button]:bg-transparent [&_button]:text-muted [&_button]:hover:bg-surface-raised"><SignOutButton /></div>
      </aside>
      <div className="min-w-0 flex-1 pb-28 lg:pb-0">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <Link href="/captain" className="flex min-h-12 items-center font-display text-xl font-extrabold">KOCHIVO</Link>
          <div className="[&_button]:bg-transparent [&_button]:text-muted [&_button]:hover:bg-surface-raised"><SignOutButton /></div>
        </div>
        <main>{children}</main>
      </div>
      <BottomNav aria-label="قائمة الكابتن" items={mobileLinks} className="lg:hidden" />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/ui';
import { captainNav, mobileCaptainNav } from '../nav';

export function CaptainNav() {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label="قائمة الكابتن" className="hidden space-y-1 lg:block">
        {captainNav(pathname).map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-control px-3 text-sm ${active ? 'glass-raised font-bold text-lime' : 'text-muted hover:text-ink'}`}>
            <Icon aria-hidden className="size-5" />{label}
          </Link>
        ))}
      </nav>
      <BottomNav aria-label="قائمة الكابتن" items={mobileCaptainNav(pathname)} className="lg:hidden" />
    </>
  );
}

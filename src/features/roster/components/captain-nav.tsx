'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/ui';
import { captainNav, mobileCaptainNav } from '../nav';

export function CaptainNav() {
  const t = useT(messages);
  const pathname = usePathname();
  return (
    <>
      <nav aria-label={t('captainMenu')} className="hidden space-y-1 lg:block">
        {captainNav(pathname, t).map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-control px-3 text-sm ${active ? 'glass-raised font-bold text-lime' : 'text-muted hover:text-ink'}`}>
            <Icon aria-hidden className="size-5" />{label}
          </Link>
        ))}
      </nav>
      <BottomNav aria-label={t('captainMenu')} items={mobileCaptainNav(pathname, t)} className="lg:hidden" />
    </>
  );
}

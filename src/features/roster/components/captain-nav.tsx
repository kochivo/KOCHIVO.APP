'use client';

import { useT } from '@/core/i18n/client';
import { Fragment, useCallback } from 'react';
import { messages } from '../messages';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/ui';
import { captainMobileNav, captainNav } from '../nav';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useResource } from '@/core/resource';
import { fetchWaitingCount } from '../data/navigation-count';

export function CaptainNav({ waitingCount = null }: { waitingCount?: number | null }) {
  const t = useT(messages);
  const pathname = usePathname();
  const workspace = captainWorkspaceEnabled();
  const load = useCallback(() => fetchWaitingCount(), []);
  const count = useResource(workspace ? 'captain:waiting-count' : null, load, { pollMs: 30_000 });
  const waiting = count.error ? null : count.data === undefined ? waitingCount : count.data;
  return (
    <>
      <nav aria-label={t('captainMenu')} className="hidden space-y-inline lg:block">
        {captainNav(pathname, t).map(({ href, label, icon: Icon, active, group }) => (
          <Fragment key={href}>
          {group && <h2 className="px-stack pt-stack text-sm text-muted">{group}</h2>}
          <Link href={href} data-tour={href} aria-current={active ? 'page' : undefined}
            className={`flex min-h-12 items-center gap-stack rounded-control px-stack text-sm ${active ? 'glass-raised font-bold text-lime' : 'text-muted hover:text-ink'}`}>
            <Icon aria-hidden {...(workspace ? { active } : {})} className="size-5" />{label}
            {workspace && href === '/captain/inbox' && (waiting === null
              ? <span className="sr-only">{t('waitingUnavailable')}</span>
              : waiting > 0 ? <span aria-label={t('waitingCount', { count: waiting })} className="ms-auto rounded-full bg-lime/10 px-inline text-xs font-bold tabular-nums text-lime">{waiting}</span> : null)}
          </Link>
          </Fragment>
        ))}
      </nav>
      <BottomNav aria-label={t('captainMenu')} items={captainMobileNav(pathname, t)} className="lg:hidden" />
    </>
  );
}

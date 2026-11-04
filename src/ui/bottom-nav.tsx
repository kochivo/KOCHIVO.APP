'use client';

import Link, { useLinkStatus } from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface BottomNavProps extends HTMLAttributes<HTMLElement> {
  items: { href: string; label: string; icon: LucideIcon; active?: boolean }[];
}

function NavContent({ label, icon: Icon, active }: BottomNavProps['items'][number]) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending} className={cn('flex w-full min-w-0 flex-col items-center justify-center gap-1',
    pending ? 'font-bold text-lime' : active ? 'font-bold text-lime group-has-[[data-pending=true]]/nav:text-muted' : 'text-muted hover:text-ink')}>
    <Icon aria-hidden className={cn('size-5', (active || pending) && 'fill-current',
      active && !pending && 'group-has-[[data-pending=true]]/nav:fill-none')} />
    <span className="max-w-full truncate">{label}</span>
  </span>;
}

export function BottomNav({ items, className, ...props }: BottomNavProps) {
  if (items.length === 0) return null;
  return (
    <nav {...props} className={cn('group/nav sheet fixed start-[max(1rem,var(--safe-start))] end-[max(1rem,var(--safe-end))] bottom-[calc(1rem+var(--safe-bottom))] z-10 mx-auto flex h-[var(--nav-height)] max-w-lg gap-1 rounded-card p-2', className)}>
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link key={href} href={href} data-tour={href} aria-current={active ? 'page' : undefined} className="press flex min-h-14 min-w-0 flex-1 items-center justify-center rounded-control px-0.5 py-2 text-[0.6875rem] leading-4">
          <NavContent href={href} label={label} icon={Icon} active={active} />
        </Link>
      ))}
    </nav>
  );
}

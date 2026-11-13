'use client';

import Link, { useLinkStatus } from 'next/link';
import type { NavIcon } from './icons/ko-icon';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface BottomNavProps extends HTMLAttributes<HTMLElement> {
  variant?: 'bar' | 'pill';
  items: { href: string; label: string; icon: NavIcon; active?: boolean; engraved?: boolean }[];
}

function NavContent({ label, icon: Icon, active, engraved }: BottomNavProps['items'][number]) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending} className={cn('flex w-full min-w-0 flex-col items-center justify-center gap-1',
    pending ? 'font-bold text-lime' : active ? 'font-bold text-lime group-has-[[data-pending=true]]/nav:text-muted' : 'text-muted hover:text-ink')}>
    <Icon aria-hidden {...(engraved ? { active: active || pending } : {})}
      className={engraved ? 'size-5' : cn('size-5', (active || pending) && 'fill-current',
        active && !pending && 'group-has-[[data-pending=true]]/nav:fill-none')} />
    <span className="max-w-full truncate">{label}</span>
  </span>;
}

function PillContent({ label, icon: Icon, active, engraved }: BottomNavProps['items'][number]) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending} className={cn('flex items-center justify-center gap-2', pending && 'animate-pulse motion-reduce:animate-none')}>
    <Icon aria-hidden {...(engraved ? { active: active || pending } : {})} className={active ? 'size-[20px]' : 'size-[22px]'} />
    {active && <span>{label}</span>}
  </span>;
}

export function BottomNav({ items, variant = 'bar', className, ...props }: BottomNavProps) {
  if (items.length === 0) return null;
  if (variant === 'pill') return (
    <nav {...props} className={cn('fixed start-4 end-4 bottom-[calc(1rem+var(--safe-bottom))] z-10 mx-auto flex h-[68px] max-w-lg items-center justify-around rounded-full border border-line-soft bg-surface-raised px-1.5', className)}>
      {items.map(({ href, label, icon: Icon, active, engraved }) => (
        <Link key={href} href={href} data-tour={href} aria-current={active ? 'page' : undefined}
          aria-label={active ? undefined : label}
          className={cn('press flex shrink-0 items-center justify-center rounded-full [&_svg]:text-inherit [&_svg_*]:text-inherit',
            active ? 'h-[52px] gap-2 bg-ink text-bg px-4 text-[13px] font-extrabold' : 'size-[52px] text-muted')}>
          <PillContent href={href} label={label} icon={Icon} active={active} engraved={engraved} />
        </Link>
      ))}
    </nav>
  );
  return (
    <nav {...props} className={cn('group/nav sheet fixed start-[max(1rem,var(--safe-start))] end-[max(1rem,var(--safe-end))] bottom-[calc(1rem+var(--safe-bottom))] z-10 mx-auto flex h-[var(--nav-height)] max-w-lg justify-around gap-1 rounded-card p-2', className)}>
      {items.map(({ href, label, icon: Icon, active, engraved }) => (
        <Link key={href} href={href} data-tour={href} aria-current={active ? 'page' : undefined} className="press flex min-h-14 min-w-0 flex-1 items-center justify-center rounded-control px-0.5 py-2 text-[0.6875rem] leading-4">
          <NavContent href={href} label={label} icon={Icon} active={active} engraved={engraved} />
        </Link>
      ))}
    </nav>
  );
}

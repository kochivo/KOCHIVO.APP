'use client';

import Link, { useLinkStatus } from 'next/link';
import type { BottomNavProps } from './bottom-nav';
import { cn } from '@/lib/cn';

// Kept out of the ui barrel: only the player shell uses it, so public pages do not pay for it.
function PillContent({ label, icon: Icon, active, engraved }: BottomNavProps['items'][number]) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending} className={cn('flex items-center justify-center gap-2', pending && 'animate-pulse motion-reduce:animate-none')}>
    <Icon aria-hidden {...(engraved ? { active: active || pending } : {})} className={active ? 'size-[20px]' : 'size-[22px]'} />
    {active && <span>{label}</span>}
  </span>;
}

export function PillNav({ items, className, ...props }: BottomNavProps) {
  if (items.length === 0) return null;
  return (
    <nav {...props} className={cn('fixed start-4 end-4 bottom-[calc(1rem+var(--safe-bottom))] z-10 mx-auto flex h-[68px] max-w-lg items-center justify-around rounded-full border border-line-soft bg-surface-raised px-1.5', className)}>
      {items.map(({ href, label, icon, active, engraved }) => (
        <Link key={href} href={href} data-tour={href} aria-current={active ? 'page' : undefined}
          aria-label={active ? undefined : label}
          className={cn('press flex shrink-0 items-center justify-center rounded-full [&_svg]:text-inherit [&_svg_*]:text-inherit',
            active ? 'h-[52px] gap-2 bg-ink text-bg px-4 text-[13px] font-extrabold' : 'size-[52px] text-muted')}>
          <PillContent href={href} label={label} icon={icon} active={active} engraved={engraved} />
        </Link>
      ))}
    </nav>
  );
}

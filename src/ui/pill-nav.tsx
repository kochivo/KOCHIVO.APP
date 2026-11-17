'use client';

import Link, { useLinkStatus } from 'next/link';
import type { BottomNavProps } from './bottom-nav';
import { cn } from '@/lib/cn';

// Kept out of the ui barrel: only the player shell uses it, so public pages do not pay for it.
function PillContent({ label, icon: Icon, active, engraved }: BottomNavProps['items'][number]) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending} className={cn('flex flex-col items-center gap-inline', pending && 'animate-pulse motion-reduce:animate-none')}>
    <Icon aria-hidden {...(engraved ? { active: active || pending } : {})} className="size-5" />
    <span>{label}</span>
  </span>;
}

export function PillNav({ items, className, ...props }: BottomNavProps) {
  if (items.length === 0) return null;
  return (
    <nav {...props} className={cn('fixed inset-x-0 bottom-0 z-10 border-t border-line-soft bg-bg/95 pb-[var(--safe-bottom)] backdrop-blur-md', className)}>
      <div className="mx-auto flex min-h-[var(--nav-height)] max-w-lg items-stretch px-inline">
      {items.map(({ href, label, icon, active, engraved }) => (
        <Link key={href} href={href} data-tour={href} aria-current={active ? 'page' : undefined}
          className={cn('press flex min-h-12 min-w-0 flex-1 items-center justify-center text-center text-micro [&_svg]:text-inherit [&_svg_*]:text-inherit',
            active ? 'font-bold text-lime' : 'text-faint')}>
          <PillContent href={href} label={label} icon={icon} active={active} engraved={engraved} />
        </Link>
      ))}
      </div>
    </nav>
  );
}

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface BottomNavProps extends HTMLAttributes<HTMLElement> {
  items: { href: string; label: string; icon: LucideIcon; active?: boolean }[];
}

export function BottomNav({ items, className, ...props }: BottomNavProps) {
  if (items.length === 0) return null;
  return (
    <nav {...props} className={cn('glass-strong [--glass-strong-tint:color-mix(in_srgb,var(--color-surface)_92%,transparent)] fixed start-[max(1rem,var(--safe-start))] end-[max(1rem,var(--safe-end))] bottom-4 z-10 mx-auto flex max-w-lg gap-1 rounded-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]', className)}>
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('press flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control px-0.5 py-2 text-[0.6875rem]', active ? 'font-bold text-lime' : 'text-muted hover:text-ink')}>
          <Icon aria-hidden className={cn('size-5', active && 'fill-current')} /><span className="max-w-full truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

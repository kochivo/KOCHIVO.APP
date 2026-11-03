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
    <nav {...props} className={cn('glass fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-lg gap-1 rounded-card p-2', className)}>
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control px-2 py-2 text-xs', active ? 'bg-lime-soft text-lime' : 'text-muted hover:text-ink')}>
          <Icon aria-hidden className="size-5" /><span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

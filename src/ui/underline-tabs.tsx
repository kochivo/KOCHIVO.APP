import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface UnderlineTab { href: string; label: string; active?: boolean }

export function UnderlineTabs({ items, label }: { items: readonly UnderlineTab[]; label: string }) {
  return <nav aria-label={label} className="min-w-0 border-b border-line-soft">
    <ul className="flex flex-wrap gap-x-1 gap-y-1">{items.map(item => <li key={item.href}>
      <Link href={item.href} prefetch={false} aria-current={item.active ? 'page' : undefined}
        className={cn('flex min-h-12 items-center border-b-2 px-4 py-3 text-sm',
          item.active ? 'border-lime text-ink' : 'border-transparent text-faint hover:text-ink')}>{item.label}</Link>
    </li>)}</ul>
  </nav>;
}

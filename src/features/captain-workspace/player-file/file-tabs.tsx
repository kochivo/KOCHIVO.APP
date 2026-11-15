import Link from 'next/link';
import type { UnderlineTab } from '@/ui/underline-tabs';

export function FileTabs({ items, label }: { items: readonly UnderlineTab[]; label: string }) {
  return <nav aria-label={label} className="w-fit max-w-full overflow-x-auto rounded-full border border-line bg-bg/25 p-inline">
    <ul className="flex w-max gap-inline">{items.map(item => <li key={item.href}>
      <Link href={item.href} prefetch={false} aria-current={item.active ? 'page' : undefined}
        className={`press flex min-h-12 cursor-pointer items-center whitespace-nowrap rounded-full px-stack text-xs focus-visible:ring-2 focus-visible:ring-lime ${item.active ? 'glass-strong text-ink' : 'text-muted hover:text-ink'}`}>{item.label}</Link>
    </li>)}</ul>
  </nav>;
}

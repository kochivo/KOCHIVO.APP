import type { AnchorHTMLAttributes } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

export function RowLink({ children, className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={cn('press flex min-h-12 cursor-pointer items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-lime', className)}>
    <span className="min-w-0 flex-1">{children}</span>
    <ChevronLeft aria-hidden className="dir-icon size-5 shrink-0 text-muted" />
  </a>;
}

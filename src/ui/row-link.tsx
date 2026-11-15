import type { AnchorHTMLAttributes } from 'react';
import { RowChevron } from './row-chevron';
import { clickableClass } from './button';
import { cn } from '@/lib/cn';

export const rowLinkClass = cn(clickableClass, 'min-h-12 rounded-control border border-line bg-surface hover:bg-surface-raised');

export function RowLink({ children, className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={cn(rowLinkClass, 'flex items-center gap-stack px-page-x py-stack', className)}>
    <span className="min-w-0 flex-1">{children}</span>
    <RowChevron />
  </a>;
}

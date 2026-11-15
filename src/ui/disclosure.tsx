'use client';

import { useState } from 'react';
import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { DisclosureChevron } from './disclosure-chevron';
import { rowLinkClass } from './row-link';
import { cn } from '@/lib/cn';

interface Props extends DetailsHTMLAttributes<HTMLDetailsElement> { label: ReactNode }

export function Disclosure({ label, children, className, open, onToggle, ...props }: Props) {
  const [expanded, setExpanded] = useState(open ?? false);
  return <details {...props} open={open} className={cn('group rounded-control border border-line bg-surface', className)}
    onToggle={event => { setExpanded(event.currentTarget.open); onToggle?.(event); }}>
    <summary aria-expanded={open ?? expanded} className={cn(rowLinkClass, 'flex list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden')}>
      <span className="flex-1">{label}</span>
      <DisclosureChevron expanded={open ?? expanded} />
    </summary>
    <div className="px-4 pb-4">{children}</div>
  </details>;
}

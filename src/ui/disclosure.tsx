'use client';

import { useState } from 'react';
import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props extends DetailsHTMLAttributes<HTMLDetailsElement> { label: ReactNode }

export function Disclosure({ label, children, className, open, onToggle, ...props }: Props) {
  const [expanded, setExpanded] = useState(open ?? false);
  return <details {...props} open={open} className={cn('group rounded-control border border-line bg-surface', className)}
    onToggle={event => { setExpanded(event.currentTarget.open); onToggle?.(event); }}>
    <summary aria-expanded={open ?? expanded} className="press flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-control px-4 py-3 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-lime [&::-webkit-details-marker]:hidden">
      <span className="flex-1">{label}</span>
      <ChevronDown aria-hidden className="size-5 shrink-0 group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4">{children}</div>
  </details>;
}

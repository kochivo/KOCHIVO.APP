import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export function DisclosureChevron({ expanded, className }: { expanded?: boolean; className?: string }) {
  return <ChevronDown aria-hidden className={cn('size-5 shrink-0 text-muted motion-safe:transition-transform',
    expanded === undefined ? 'group-open:rotate-180' : expanded && 'rotate-180', className)} />;
}

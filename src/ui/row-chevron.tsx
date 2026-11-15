import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

export function RowChevron({ className }: { className?: string }) {
  return <ChevronLeft aria-hidden className={cn('dir-icon size-5 shrink-0 text-muted', className)} />;
}

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function WorkspaceBillingTask({ label, count, children }: { label: string; count: string; children: ReactNode }) {
  return <details data-billing-task className="group/task border-t border-line-soft">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-stack rounded-control px-card text-row text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime">
      <span className="flex-1 font-semibold">{label}</span>
      <span className="tabular-nums text-faint">{count}</span>
      <ChevronDown aria-hidden className="size-4 shrink-0 group-open/task:rotate-180" />
    </summary>
    <div className="px-card pb-stack">{children}</div>
  </details>;
}

import type { ReactNode } from 'react';
export function WorkspaceFact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-line-soft px-[18px] py-2.5 text-[13px] first:border-t-0">
    <dt className="text-muted">{label}</dt><dd className="flex min-w-0 flex-wrap items-center gap-2 text-end">{children}</dd>
  </div>;
}

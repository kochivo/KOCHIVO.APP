import type { ReactNode } from 'react';
export function WorkspaceFact({ label, children, flagged = false }: { label: string; children: ReactNode; flagged?: boolean }) {
  return <div className="flex min-h-12 flex-wrap items-center justify-between gap-stack border-t border-line-soft px-page-x py-stack text-row first:border-t-0">
    <dt className="text-muted">{label}</dt><dd className={`flex min-w-0 flex-wrap items-center gap-inline text-end ${flagged ? 'text-warn' : ''}`}>{children}</dd>
  </div>;
}

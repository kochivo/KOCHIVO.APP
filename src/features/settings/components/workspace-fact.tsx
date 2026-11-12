import type { ReactNode } from 'react';

export function WorkspaceFact({ label, children, danger = false }: { label: string; children: ReactNode; danger?: boolean }) {
  return <div className="flex min-w-0 items-center justify-between gap-3 border-t border-line-soft py-2.5 text-[13px] first:border-t-0">
    <span className={danger ? 'text-danger' : 'text-muted'}>{label}</span><div className="min-w-0 break-words">{children}</div>
  </div>;
}

import type { ReactNode } from 'react';

export function LibraryWorkspace({ busy, children, editor }: { busy: boolean; children?: ReactNode; editor: ReactNode }) {
  return <div aria-busy={busy} className="min-w-0"
    onClickCapture={event => {
      if (busy && (event.target as Element).closest?.('a[href]')) {
        event.preventDefault(); event.stopPropagation();
      }
    }}>
    {!editor && <div className={busy ? '[&_a]:opacity-60' : undefined}>{children}</div>}
    {editor}
  </div>;
}

import type { ReactNode } from 'react';

export function LibraryWorkspace({ busy, children, editor }: { busy: boolean; children?: ReactNode; editor: ReactNode }) {
  return <div aria-busy={busy} className="grid items-start gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]"
    onClickCapture={event => {
      if (busy && (event.target as Element).closest?.('a[href]')) {
        event.preventDefault(); event.stopPropagation();
      }
    }}>
    <div className={busy ? '[&_a]:opacity-60' : undefined}>{children}</div>
    {editor}
  </div>;
}

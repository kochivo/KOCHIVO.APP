import { useEffect } from 'react';
import type { ReactNode } from 'react';

export function KoTeaserCorner({ labelId, label, onClose, children }: {
  labelId?: string; label?: string; onClose: () => void; children: ReactNode;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog:modal')) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return <section data-ko-teaser-corner role="dialog" aria-labelledby={labelId} aria-label={label}
    className="sheet fixed end-page-x bottom-page-y z-50 m-0 max-h-[75dvh] w-95 max-w-[calc(100vw-2*var(--spacing-page-x))] overflow-y-auto rounded-card border border-line p-card text-start text-ink shadow-xl">
    {children}
  </section>;
}

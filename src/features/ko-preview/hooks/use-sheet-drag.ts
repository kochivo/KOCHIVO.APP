import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';

export function useSheetDrag(enabled: boolean, close: () => void) {
  const active = useRef<{ id: number; startY: number } | null>(null);
  const [offset, setOffset] = useState(0);

  function finish(event: PointerEvent<HTMLElement>, released: boolean) {
    const drag = active.current;
    if (!drag || drag.id !== event.pointerId) return;
    active.current = null;
    setOffset(0);
    if (released && event.clientY - drag.startY > 80 && !window.matchMedia('(min-width: 64rem)').matches) close();
  }

  return { offset, handlers: {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || active.current || !event.isPrimary || event.button !== 0
        || window.matchMedia('(min-width: 64rem)').matches || (event.target as Element).closest('button')) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      active.current = { id: event.pointerId, startY: event.clientY };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const drag = active.current;
      if (drag?.id === event.pointerId && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setOffset(Math.max(0, event.clientY - drag.startY));
      }
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, true),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, false),
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => finish(event, false),
  } };
}

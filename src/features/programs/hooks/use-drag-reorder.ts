'use client';

import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, PointerEvent } from 'react';

export type DragHandleProps = Pick<ButtonHTMLAttributes<HTMLButtonElement>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture'>;
type Bounds = { top: number; height: number };
type Drag = {
  id: string; pointerId: number; handle: HTMLButtonElement; from: number; to: number;
  startY: number; clientY: number; offset: number; rows: Bounds[]; stride: number;
};

// The dragged row is excluded: each crossed midpoint is one insertion slot.
export function getTargetIndex(y: number, midpoints: readonly number[]): number {
  return midpoints.filter(midpoint => y >= midpoint).length;
}

export function useDragReorder(ids: readonly string[], onDrop: (id: string, toIndex: number) => void) {
  const listRef = useRef<HTMLOListElement>(null);
  const active = useRef<Drag | null>(null);
  const frame = useRef<number | null>(null);
  const [preview, setPreview] = useState<Drag | null>(null);
  const drop = useRef(onDrop);
  useEffect(() => { drop.current = onDrop; }, [onDrop]);

  function finish(commit: boolean) {
    const drag = active.current;
    active.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (!drag) return;
    if (drag.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
    setPreview(null);
    if (commit && drag.from !== drag.to) drop.current(drag.id, drag.to);
  }

  function refresh(clientY: number) {
    const drag = active.current;
    const origin = drag?.rows[drag.from];
    if (!drag || !origin) return;
    const offset = clientY + window.scrollY - drag.startY;
    const midpoints = drag.rows.filter((_, index) => index !== drag.from).map(row => row.top + row.height / 2);
    const next = { ...drag, clientY, offset, to: getTargetIndex(origin.top + origin.height / 2 + offset, midpoints) };
    active.current = next;
    if (next.offset !== drag.offset || next.to !== drag.to) setPreview(next);
  }

  function scrollFrame() {
    const drag = active.current;
    if (!drag) return;
    const edge = 72;
    const speed = drag.clientY < edge ? -Math.ceil((edge - Math.max(0, drag.clientY)) / 6)
      : drag.clientY > window.innerHeight - edge
        ? Math.ceil((Math.min(window.innerHeight, drag.clientY) - window.innerHeight + edge) / 6) : 0;
    if (speed) window.scrollBy({ top: speed, behavior: 'instant' });
    refresh(drag.clientY);
    frame.current = requestAnimationFrame(scrollFrame);
  }

  function start(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (active.current || !event.isPrimary || event.button !== 0) return;
    const from = ids.indexOf(id);
    const rows = Array.from(listRef.current?.children ?? []).map(element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top + window.scrollY, height: rect.height };
    });
    const origin = rows[from];
    if (!origin || rows.length !== ids.length) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = rows[from + 1];
    const previous = rows[from - 1];
    const gap = next ? next.top - origin.top - origin.height
      : previous ? origin.top - previous.top - previous.height : 0;
    const drag: Drag = { id, from, to: from, pointerId: event.pointerId, handle: event.currentTarget,
      startY: event.clientY + window.scrollY, clientY: event.clientY, offset: 0, rows, stride: origin.height + gap };
    active.current = drag;
    setPreview(drag);
    frame.current = requestAnimationFrame(scrollFrame);
  }

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active.current) { event.preventDefault(); finish(false); }
    };
    window.addEventListener('keydown', cancel);
    return () => {
      window.removeEventListener('keydown', cancel);
      const drag = active.current;
      active.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (drag?.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
    };
  }, []);
  const order = ids.join('\0');
  useEffect(() => { finish(false); }, [order]);

  function handleProps(id: string): DragHandleProps {
    const owns = (event: PointerEvent<HTMLButtonElement>) => active.current?.pointerId === event.pointerId;
    return {
      onPointerDown: event => start(event, id),
      onPointerMove: event => { if (owns(event)) { event.preventDefault(); refresh(event.clientY); } },
      onPointerUp: event => { if (owns(event)) { refresh(event.clientY); finish(true); } },
      onPointerCancel: event => { if (owns(event)) finish(false); },
      onLostPointerCapture: event => { if (owns(event)) finish(false); },
    };
  }

  function rowStyle(index: number): CSSProperties | undefined {
    if (!preview) return;
    const { from, to, stride } = preview;
    const offset = index === from ? preview.offset
      : from < to && index > from && index <= to ? -stride
        : from > to && index >= to && index < from ? stride : 0;
    return { transform: `translateY(${offset}px)`, position: 'relative', zIndex: index === from ? 1 : 0 };
  }

  return { listRef, handleProps, rowStyle, draggingId: preview?.id ?? null };
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Region } from '../analytics/muscle-map';

export function clampChip(x: number, y: number, width: number, height: number) {
  const chipWidth = Math.min(240, Math.max(0, width - 16));
  return { x: Math.max(8, Math.min(x, width - chipWidth - 8)),
    y: Math.max(8, Math.min(y, height - 80)), width: chipWidth };
}

export function useMusclePopover() {
  const card = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ region: Region; x: number; y: number; width: number } | null>(null);
  useEffect(() => {
    if (!selection) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('[data-muscle-trigger]')) setSelection(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelection(null); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [selection]);
  const select = (region: Region, x: number, y: number) => {
    const bounds = card.current?.getBoundingClientRect();
    if (bounds) setSelection({ region, ...clampChip(x - bounds.x, y - bounds.y, bounds.width, bounds.height) });
  };
  return { card, selection, select, close: () => setSelection(null) };
}

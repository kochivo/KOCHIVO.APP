'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function Deferred({ children, fallback }: { children?: ReactNode; fallback: ReactNode }) {
  const target = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={target} className="min-w-0">{visible ? children : fallback}</div>;
}

'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export function ExerciseImage({ src, alt, width, height, fullWidth = false, className = '' }: {
  src: string; alt: string; width: number; height: number; fullWidth?: boolean; className?: string;
}) {
  const target = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      setVisible(false);
      if (motion.matches) return;
      if (!('IntersectionObserver' in window)) { setVisible(true); return; }
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer?.disconnect(); }
      });
      observer.observe(element);
    };
    observe();
    motion.addEventListener('change', observe);
    return () => { observer?.disconnect(); motion.removeEventListener('change', observe); };
  }, []);
  const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'/%3E`;
  return <span ref={target}
    style={{ aspectRatio: `${width}/${height}`, width: fullWidth ? '100%' : width, maxWidth: '100%' }}
    className={`inline-block shrink-0 overflow-hidden rounded-control bg-surface-raised align-middle ${className}`}>
    <Image unoptimized src={visible ? src : placeholder} alt={alt} width={width} height={height}
      loading="lazy" decoding="async" className="h-full w-full object-contain" />
  </span>;
}

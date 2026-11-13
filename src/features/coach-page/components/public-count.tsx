'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';

export function PublicCount({ value, unit }: { value: number; unit: string }) {
  const locale = useLocale(), ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(value);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      let start: number | undefined;
      const tick = (now: number) => {
        start ??= now;
        const progress = Math.min(1, (now - start) / 700);
        setCount(Math.round(value * progress));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <span ref={ref} dir="ltr" aria-label={`${formatNumber(value, locale)}${unit}`}><span aria-hidden>{formatNumber(count, locale)}{unit}</span></span>;
}

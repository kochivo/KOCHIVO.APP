'use client';

import { useEffect } from 'react';
import { observeInView } from '@/lib/use-in-view';
import { attachLandingMotion } from '../data/landing-motion';

export function LandingMotion() {
  useEffect(() => {
    const loops = typeof IntersectionObserver === 'undefined' ? [] : Array.from(
      document.querySelectorAll<HTMLElement>('.marketing-phone'), element => observeInView(element, document));
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cleanup = attachLandingMotion(document, window, media.matches);
    const change = () => { cleanup(); cleanup = attachLandingMotion(document, window, media.matches); };
    media.addEventListener('change', change);
    return () => { loops.forEach(dispose => dispose()); cleanup(); media.removeEventListener('change', change); };
  }, []);
  return null;
}

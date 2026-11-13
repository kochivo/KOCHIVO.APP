'use client';

import { useEffect } from 'react';
import { attachLandingMotion } from '../data/landing-motion';

export function LandingMotion() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cleanup = attachLandingMotion(document, window, media.matches);
    const change = () => { cleanup(); cleanup = attachLandingMotion(document, window, media.matches); };
    media.addEventListener('change', change);
    return () => { cleanup(); media.removeEventListener('change', change); };
  }, []);
  return null;
}

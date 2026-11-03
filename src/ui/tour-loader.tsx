'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { TourBoundary } from './tour/boundary';
import { messages } from './tour/messages';
import { tourSteps } from './tour/steps';
import { rememberTour, tourDue } from './tour/state';

const LazyTour = dynamic(() => import('./tour').then(module => module.Tour), { ssr: false });

export function TourLoader({ userId, role, seenAt, demo, onSeen }: {
  userId: string; role: 'captain' | 'player'; seenAt: string | null; demo: boolean; onSeen: () => Promise<void>;
}) {
  const pathname = usePathname();
  const t = useT(messages);
  const steps = useMemo(() => tourSteps(role, t), [role, t]);
  const [open, setOpen] = useState(false);
  const [replay, setReplay] = useState(false);
  const home = pathname === `/${role}`;
  const close = useCallback(() => {
    setOpen(false); setReplay(false);
    try { rememberTour(localStorage, userId, new Date().toISOString()); }
    catch (error) { console.warn('Could not cache tour state', error); }
    void onSeen().catch(error => console.warn('Could not save tour state', error));
  }, [onSeen, userId]);
  useEffect(() => {
    const start = () => setReplay(true);
    window.addEventListener('kochivo:replay-tour', start);
    return () => window.removeEventListener('kochivo:replay-tour', start);
  }, []);
  useEffect(() => {
    if (!home) return;
    let failed = false;
    const update = () => {
      if (failed) return;
      try {
        if (seenAt) rememberTour(localStorage, userId, seenAt);
        setOpen(!!document.querySelector('[data-tour-ready="true"]') && (replay || tourDue(localStorage, userId, seenAt, demo)));
      } catch (error) { failed = true; console.warn('Could not read tour state', error); setOpen(false); }
    };
    const frame = requestAnimationFrame(() => {
      try {
        update();
      } catch (error) { console.warn('Could not start tour', error); }
    });
    let observer: MutationObserver | undefined;
    try {
      observer = new MutationObserver(update);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-tour-ready'] });
    } catch (error) { failed = true; console.warn('Could not watch tour readiness', error); }
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [home, replay, userId, seenAt, demo]);
  return open && home ? <TourBoundary onClose={close}><LazyTour steps={steps} onClose={close} /></TourBoundary> : null;
}

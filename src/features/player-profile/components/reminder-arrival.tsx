'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { focusRecorder } from '../recorder-focus';

export function ReminderArrival({ playerId, children }: { playerId: string; children: ReactNode }) {
  useEffect(() => {
    const arrive = () => {
      if (window.location.hash === `#voice-recorder-${playerId}`) focusRecorder(playerId);
    };
    arrive();
    window.addEventListener('hashchange', arrive);
    return () => window.removeEventListener('hashchange', arrive);
  }, [playerId]);
  return children;
}

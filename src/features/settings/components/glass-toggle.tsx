'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useSyncExternalStore } from 'react';

const changeEvent = 'kochivo:glass-change';
const snapshot = () => document.documentElement.dataset.glass === 'solid';
const serverSnapshot = () => false;
function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  return () => window.removeEventListener(changeEvent, onChange);
}

export function GlassToggle() {
  const t = useT(messages);
  const solid = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return <button type="button" role="switch" aria-checked={solid}
    className="glass flex min-h-12 w-full items-center justify-between gap-4 rounded-card p-6 text-start"
    onClick={() => {
      const mode = snapshot() ? 'blur' : 'solid';
      document.documentElement.dataset.glass = mode;
      try { localStorage.setItem('kochivo.glass', mode); } catch {
        // Keep the current-page choice usable when browser storage is blocked.
      }
      window.dispatchEvent(new Event(changeEvent));
    }}>
    <span>{t('lighterVisualsForSlowerPhones')}</span>
    <span aria-hidden="true" className={`shrink-0 rounded-control px-3 py-1 ${solid ? 'bg-lime text-on-lime' : 'bg-surface text-muted'}`}>
      {solid ? t('on') : t('off')}
    </span>
  </button>;
}

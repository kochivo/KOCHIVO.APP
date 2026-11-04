'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { captureException } from '@sentry/nextjs';
import { useT } from '@/core/i18n/client';
import { SwitchTrack } from '@/ui';
import { publicConfig } from '@/lib/public-config';
import { currentPushState, subscribePush, unsubscribePush } from '../data/push-subscriptions';
import { pushSupport } from '../push-support';
import type { PushSupport } from '../push-support';
import { messages } from '../messages';
import { initialPushState, pushReducer } from '../push-state';

export function PushToggleCard() {
  const t = useT(messages);
  const [support, setSupport] = useState<PushSupport>('unsupported');
  const [{ on, denied, status }, dispatch] = useReducer(pushReducer, initialPushState);
  const pending = status === 'loading' || status === 'saving';
  const error = status === 'error';
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!publicConfig.vapidPublicKey) return;
    let active = true;
    const available = pushSupport({
      serviceWorker: 'serviceWorker' in navigator, pushManager: 'PushManager' in window,
      notification: 'Notification' in window, userAgent: navigator.userAgent, platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      standalone: window.matchMedia('(display-mode: standalone)').matches
        || ('standalone' in navigator && navigator.standalone === true),
    });
    async function load() {
      setSupport(available); dispatch({ type: 'loading' });
      if (available === 'supported') {
        try {
          const enabled = await currentPushState();
          if (active) dispatch({ type: 'loaded', on: enabled, denied: Notification.permission === 'denied' });
        } catch { if (active) dispatch({ type: 'failed' }); }
      } else if (active) dispatch({ type: 'loaded', on: false, denied: false });
    }
    void load();
    return () => { active = false; };
  }, [attempt]);
  if (!publicConfig.vapidPublicKey) return null;
  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true; dispatch({ type: 'saving' });
    try {
      if (on) { await unsubscribePush(); dispatch({ type: 'loaded', on: false, denied: false }); }
      else {
        const result = await subscribePush(publicConfig.vapidPublicKey);
        dispatch({ type: 'loaded', denied: result === 'denied', on: result === 'on' });
      }
    } catch (error) {
      // The toggle only shows a generic error, so keep the real browser reason for diagnosis.
      captureException(error, { tags: { feature: 'push' } });
      dispatch({ type: 'failed' });
    }
    finally { inFlight.current = false; }
  }
  const description = support === 'ios-install' ? 'install' : support === 'unsupported' ? 'unsupported'
    : denied ? 'denied' : on ? 'on' : 'off';
  return <section className="glass rounded-card p-6" aria-busy={pending}>
    <button type="button" role="switch" aria-checked={on} aria-describedby="push-description"
      disabled={pending || support !== 'supported' || (error && !on)}
      onClick={() => void toggle()}
      className="flex min-h-12 w-full items-center justify-between gap-4 text-start disabled:opacity-50">
      <span className="font-bold">{t('title')}</span><SwitchTrack on={on} />
    </button>
    <p id="push-description" role="status" className="mt-2 text-sm text-muted">
      {t(pending ? status === 'saving' ? 'saving' : 'loading' : description)}
    </p>
    {error && <div role="alert" className="mt-2 text-sm text-danger">
      <p>{t('error')}</p>
      <button type="button" disabled={pending} onClick={() => setAttempt(value => value + 1)}
        className="min-h-12 text-lime">{t('retry')}</button>
    </div>}
  </section>;
}

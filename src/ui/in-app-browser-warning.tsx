'use client';

import { useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { detectInAppBrowser } from '@/lib/in-app-browser';
import { messages } from './messages';

const key = 'kochivo.in-app-warning.dismissed';
const subscribe = () => () => {};
const serverSnapshot = () => false;
function browserSnapshot() {
  if (!detectInAppBrowser(navigator.userAgent)) return false;
  try { return !sessionStorage.getItem(key); } catch { return true; }
}

export function InAppBrowserWarning() {
  const t = useT(messages);
  const visible = useSyncExternalStore(subscribe, browserSnapshot, serverSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  if (!visible || dismissed) return null;
  return <aside role="alert" className="glass-strong sticky top-0 z-50 flex flex-wrap items-center gap-3 p-3 text-ink">
    <p className="min-w-0 flex-1">{t('inAppBrowserWarning')}</p>
    <button type="button" className="min-h-12 rounded-control px-4 text-lime" onClick={async () => {
      try { await navigator.clipboard.writeText(window.location.href); setCopy('copied'); }
      catch { setCopy('failed'); }
    }}>{t('copyLink')}</button>
    {copy !== 'idle' && <p role="status">{t(copy === 'copied' ? 'linkCopied' : 'linkCopyFailed')}</p>}
    <button type="button" aria-label={t('closeNotification')} className="flex min-h-12 min-w-12 items-center justify-center text-muted"
      onClick={() => {
        try { sessionStorage.setItem(key, '1'); } catch { /* Dismissal still works without storage. */ }
        setDismissed(true);
      }}><X aria-hidden className="size-5" /></button>
  </aside>;
}

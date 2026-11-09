'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

export function createApproval(token: string, receivedAt: number) {
  let available = true;
  return {
    receivedAt,
    expired: (now: number) => now >= receivedAt + 600_000,
    clear() { available = false; },
    take(now: number): string | null {
      if (!available || now >= receivedAt + 600_000) return null;
      available = false;
      return token;
    },
  };
}

export function KoConfirm({ approval, busy, onConfirm, onCancel, now = Date.now }: {
  approval: ReturnType<typeof createApproval>; busy: boolean;
  onConfirm: () => void; onCancel: () => void; now?: () => number;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const confirm = useRef<HTMLButtonElement>(null);
  const locked = useRef(false);
  const [expired, setExpired] = useState(() => approval.expired(now()));
  useEffect(() => {
    confirm.current?.focus();
    const timer = setTimeout(() => setExpired(true), Math.max(0, approval.receivedAt + 600_000 - now()));
    return () => clearTimeout(timer);
  }, [approval, now]);
  return <div role="group" aria-label={t('confirmLabel')} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="flex flex-wrap gap-2">
    {expired ? <p className="text-muted">{t('confirmExpired')}</p> : <>
      <button ref={confirm} type="button" disabled={busy} className="min-h-12 rounded-control bg-lime px-4 text-on-lime disabled:opacity-50"
        onClick={() => { if (locked.current || approval.expired(now())) { setExpired(approval.expired(now())); return; } locked.current = true; onConfirm(); }}>{t('confirmAction')}</button>
      <button type="button" disabled={busy} className="min-h-12 rounded-control px-4 text-muted disabled:opacity-50"
        onClick={() => { if (locked.current) return; locked.current = true; approval.clear(); onCancel(); }}>{t('confirmCancel')}</button>
    </>}
  </div>;
}

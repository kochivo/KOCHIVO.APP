'use client';

import { useEffect, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import type { KoCredits, KoRole } from '@/features/ko-core';
import { messages } from '../messages';

export function KoCreditMeter({ role }: { role: KoRole }) {
  const locale = useLocale();
  const t = useT(messages);
  const [credits, setCredits] = useState<KoCredits | null>(null);

  useEffect(() => {
    if (role !== 'captain') return;
    const controller = new AbortController();
    const body = new FormData();
    body.set('usage', '1');
    body.set('locale', locale);
    void fetch('/api/ko', { method: 'POST', body, signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<KoCredits> : null)
      .then(result => { if (!controller.signal.aborted) setCredits(result); })
      .catch(() => { if (!controller.signal.aborted) setCredits(null); });
    return () => controller.abort();
  }, [role, locale]);

  if (role !== 'captain' || !credits || credits.cap <= 0) return null;
  const { used, cap, month } = credits;
  return <div className="space-y-inline rounded-control border border-line p-stack">
    <div className="flex items-center justify-between gap-inline">
      <span className="text-sm font-bold">{t('creditMeterTitle')}</span>
      <span className="tabular-nums text-sm">{t('creditMeterAmount', { used, cap })}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-surface-raised" aria-hidden>
      <div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(100, used / cap * 100)}%` }} />
    </div>
    <p className="text-xs text-muted">{t('creditMeterNote', { month })}</p>
  </div>;
}

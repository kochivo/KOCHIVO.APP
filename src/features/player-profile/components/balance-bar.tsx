'use client';

import { AlertTriangle } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { balance } from '../analytics/balance';
import { messages } from '../analytics/messages';

export function BalanceBar({ anterior, posterior }: { anterior: number; posterior: number }) {
  const t = useT(messages);
  const { push, pull, imbalanced } = balance(anterior, posterior);
  return <div className="space-y-3">
    <div className="flex justify-between text-sm font-bold">
      <span>{t('push')} <span className="text-lime">{t('percent', { value: push })}</span></span>
      <span>{t('pull')} <span className="text-muted">{t('percent', { value: pull })}</span></span>
    </div>
    <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-line">
      <span className="h-full bg-lime transition-all duration-150 motion-reduce:transition-none" style={{ width: `${push}%` }} />
      <span className="h-full bg-lime/25 transition-all duration-150 motion-reduce:transition-none" style={{ width: `${pull}%` }} />
    </div>
    {imbalanced && <p className="glass flex items-center gap-2 rounded-control p-3 text-sm text-muted">
      <AlertTriangle aria-hidden className="size-4 shrink-0 text-lime" />{t('imbalance')}
    </p>}
  </div>;
}

'use client';
import { Button } from './button';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';

import { Check, RefreshCw, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SyncPillProps {
  state: 'synced' | 'pending' | 'offline' | 'attention';
  pending?: number;
  onRetry?: () => void;
}

const variants: Record<SyncPillProps['state'], string> = {
  synced: 'bg-lime-soft text-lime',
  pending: 'bg-warn-soft text-warn',
  offline: 'bg-surface text-muted',
  attention: 'bg-warn-soft text-warn',
};
const icons = { synced: Check, pending: RefreshCw, offline: WifiOff, attention: AlertCircle };

export function SyncPill({ state, pending = 0, onRetry }: SyncPillProps) {
  const t = useT(messages);
  const Icon = icons[state];
  const text = state === 'attention' ? t('syncAttention') : state === 'synced' ? t('synced') : state === 'offline' ? t('offline') : t('saved', { pending });
  return <span role="status" className={cn('inline-flex flex-wrap items-center gap-2 rounded-control px-3 py-2 text-sm', variants[state])}>
    <Icon aria-hidden className="size-4" />{text}
    {state === 'attention' && <Button variant="secondary" type="button" className="min-h-12 min-w-12 rounded-control px-3 text-lime" onClick={onRetry}>{t('tryAgain')}</Button>}
  </span>;
}

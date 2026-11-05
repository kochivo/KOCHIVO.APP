'use client';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';

import { Check, RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SyncPillProps {
  state: 'synced' | 'pending' | 'offline';
  pending?: number;
}

const variants: Record<SyncPillProps['state'], string> = {
  synced: 'bg-lime-soft text-lime',
  pending: 'bg-warn-soft text-warn',
  offline: 'bg-surface text-muted',
};
const icons = { synced: Check, pending: RefreshCw, offline: WifiOff };

export function SyncPill({ state, pending = 0 }: SyncPillProps) {
  const t = useT(messages);
  const Icon = icons[state];
  const text = state === 'synced' ? t('synced') : state === 'offline' ? t('offline') : t('saved', { pending });
  return <span role="status" className={cn('inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm', variants[state])}><Icon aria-hidden className="size-4" />{text}</span>;
}

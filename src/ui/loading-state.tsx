'use client';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function LoadingState({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const t = useT(messages);
  return (
    <div {...props} role="status" aria-busy="true" className={cn('glass space-y-4 rounded-card p-6', className)}>
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden className="space-y-4 motion-safe:animate-pulse">
        <div className="h-5 w-1/3 rounded-control bg-line" />
        <div className="h-16 rounded-control bg-line" />
        <div className="h-4 w-2/3 rounded-control bg-line" />
      </div>
    </div>
  );
}

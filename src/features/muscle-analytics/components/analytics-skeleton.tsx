'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../analytics/messages';

export function AnalyticsSkeleton() {
  const t = useT(messages);
  return <div role="status" aria-label={t('loading')} className="space-y-card-gap animate-pulse motion-reduce:animate-none">
    <div className="h-12 rounded-control bg-line" />
    <div className="mx-auto h-72 w-4/5 rounded-card bg-line" />
  </div>;
}

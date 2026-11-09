'use client';

import { lazy, Suspense } from 'react';
import { useT } from '@/core/i18n/client';
import type { KoRole } from '@/features/ko-preview';
import { messages } from './messages';

const KoWidget = lazy(() => import('@/features/ko-preview').then(module => ({ default: module.KoWidget })));

// Only the server gate imports this wrapper; it is deliberately absent from index.ts.
export function KoAccountWidget({ role }: { role: KoRole }) {
  const t = useT(messages);
  return <Suspense fallback={null}><KoWidget role={role} account panelMessages={{
    loading: t('loading'), error: t('loadError'), retry: t('retry'), fallback: t('fallback'),
  }} /></Suspense>;
}

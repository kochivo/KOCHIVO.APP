'use client';

import { lazy, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import type { KoRole } from '@/features/ko-core';
import { koEntryMessages as messages } from '@/features/ko-entry';

const KoWidget = lazy(() => import('./ko-widget-entry').then(module => ({ default: module.KoWidget })));

// Only the server gate imports this wrapper; it is deliberately absent from index.ts.
export function KoAccountWidget({ role, userId }: { role: KoRole; userId: string }) {
  const t = useT(messages);
  const path = usePathname();
  // The player chat has its own composer in this corner.
  if (role === 'player' && path === '/player/captain') return null;
  return <Suspense fallback={null}><KoWidget key={userId} role={role} account userId={userId} panelMessages={{
    loading: t('loading'), error: t('loadError'), retry: t('retry'), fallback: t('fallback'),
  }} /></Suspense>;
}

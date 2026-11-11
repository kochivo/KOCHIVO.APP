'use client';

import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Locale } from '@/core/i18n/locale';
import { WorkspaceHeader } from '../components/workspace-header';
import { FormsState } from './forms-state';

const Forms = lazy(() => import('./forms-entry').then(module => ({ default: module.FormsEntry })));

export function WorkspaceViews({ playerId, name, locale, children }: {
  playerId: string; name: string; locale: Locale; children: ReactNode;
}) {
  const search = useSearchParams();
  const view = search.get('view') === 'forms' ? 'forms' : 'training';
  return <>
    <WorkspaceHeader playerId={playerId} name={name} locale={locale} view={view} />
    {view === 'forms' ? <Suspense fallback={<FormsState kind="loading" locale={locale} />}>
      <Forms key={playerId} playerId={playerId} locale={locale} />
    </Suspense> : children}
  </>;
}

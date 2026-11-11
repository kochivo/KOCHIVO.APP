import { Suspense } from 'react';
import { getLocale } from '@/core/i18n/server';
import { localDate } from '@/lib/dates';
import { WorkspaceContent } from './workspace-content';
import { WorkspaceState } from './workspace-state';

export async function WorkspaceEntry({ playerId }: { playerId: string }) {
  const locale = await getLocale();
  return <Suspense fallback={<WorkspaceState kind="loading" locale={locale} />}>
    <WorkspaceContent playerId={playerId} today={localDate(new Date())} />
  </Suspense>;
}

import 'server-only';
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { getLocale } from '@/core/i18n/server';
import { FileState } from './file-state';
import type { PlayerFileTab } from './types';

const FileContent = dynamic(() => import('./file-content').then(module => module.FileContent));

export async function PlayerFileEntry({ playerId, tab = 'overview', children }: { playerId: string; tab?: PlayerFileTab; children?: ReactNode }) {
  const locale = await getLocale();
  return <Suspense fallback={<FileState locale={locale} />}>
    <FileContent playerId={playerId} tab={tab} locale={locale}>{children}</FileContent>
  </Suspense>;
}

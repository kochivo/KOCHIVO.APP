'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
import type { TemplateKind } from '../types';

const Screen = dynamic(() => import('./templates-screen').then(module => module.TemplatesScreen), { loading: () => <LoadingState variant="cards" /> });

export function LibraryEntry({ kind }: { kind: TemplateKind }) {
  return <Screen libraryKind={kind} />;
}

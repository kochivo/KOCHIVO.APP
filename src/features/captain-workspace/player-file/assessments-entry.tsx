'use client';
import dynamic from 'next/dynamic';
import type { Locale } from '@/core/i18n/locale';
import { useLocale } from '@/core/i18n/client';
import { FileState } from './file-state';

function FormsLoading() { return <FileState locale={useLocale()} />; }
const Forms = dynamic(() => import('../forms/forms-entry').then(module => module.FormsEntry), { loading: FormsLoading });

export function PlayerAssessmentsEntry({ playerId, locale }: { playerId: string; locale: Locale }) {
  return <Forms playerId={playerId} locale={locale} />;
}

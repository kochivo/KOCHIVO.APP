'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../pages-messages';
import { PlayerAssessments } from './player-assessments-entry';

export function AssessmentsScreen() {
  const locale = useLocale(), t = useT(messages);
  return <main className="mx-auto max-w-lg space-y-3 px-[18px] pt-4 pb-[104px]">
    <header className="flex items-center gap-3">
      <Link href={`/${locale}/player/progress`} aria-label={t('back')} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised">
        <ChevronRight aria-hidden className="size-5 dir-icon" /></Link>
      <h1 className="text-xl font-black">{t('assessments')}</h1>
    </header>
    <PlayerAssessments layout="page" />
  </main>;
}

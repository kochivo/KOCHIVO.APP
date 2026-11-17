'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChevronRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useCaptainContext } from '../hooks/use-my-captain';
import { messages } from '../pages-messages';
import { CaptainProfileCard } from './captain-profile-card';

const Renewal = dynamic(() => import('@/features/billing').then(module => module.RenewalEntry));

const renewalStyle = '[&>section]:border-0 [&>section]:bg-transparent [&>section]:p-0 [&>section]:shadow-none';

export function CaptainProfileScreen() {
  const locale = useLocale(), t = useT(messages);
  const { data } = useCaptainContext();
  return <main className="mx-auto max-w-lg space-y-stack px-page-x pt-card pb-[104px]">
    <header className="flex items-center gap-stack">
      <Link href={`/${locale}/player/captain`} aria-label={t('back')} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised">
        <ChevronRight aria-hidden className="size-5 dir-icon" /></Link>
      <h1 className="text-xl font-black">{t('profileTitle')}</h1>
    </header>
    <CaptainProfileCard variant="page">
      {data && !data.pending && !data.archivedAt && <section className="space-y-stack rounded-[22px] border border-line-soft bg-surface p-card">
        <h2 className="text-md font-bold">{t('renew')}</h2>
        <p className="text-row leading-[1.6] text-muted">{t('renewalBody')}</p>
        <div className={renewalStyle}><Renewal /></div>
      </section>}
    </CaptainProfileCard>
  </main>;
}

'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button, EmptyState, ErrorState, GlassCard, LoadingState } from '@/ui';
import { formatDateAr, localDate } from '@/lib/dates';
import { whatsappUrl } from '@/lib/whatsapp';
import { accessState } from '../access';
import { useCaptainContext } from '../hooks/use-my-captain';

export function CaptainScreen({ voiceNotes }: { voiceNotes?: ReactNode }) {
  const t = useT(messages);
  const locale = useLocale();
  const labels = { active: t('subscriptionActive'), ending: t('subscriptionEndingSoon'), ended: t('subscriptionEnded'), archived: t('coachingPaused') };
  const formatDate = (date: string) => formatDateAr(date, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
  const { data, status, retry } = useCaptainContext();
  const state = data ? accessState({ ...data, today: localDate(new Date()) }) : 'active';
  const url = whatsappUrl({ phone: data?.phone ?? '' });
  return <main className="mx-auto max-w-lg space-y-5 px-5 pt-6 pb-32">
    <header><h1 className="text-2xl font-extrabold">{t('coach')}</h1></header>
    {status === 'loading' ? <LoadingState variant="detail" /> : status === 'error' ?
      <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')} onRetry={() => void retry()} /> :
      !data ? <EmptyState icon={MessageCircle} title={t('youReNotWorkingWithA')} body={t('yourCoachSDetailsWillAppear')} action={{ label: t('backHome'), href: '/player' }} /> :
        <GlassCard className="space-y-5 p-6">
          <div className="flex items-center gap-4">
            <span aria-hidden className="glass flex size-16 shrink-0 items-center justify-center rounded-card text-2xl font-bold">
              {data.fullName.trim().slice(0, 1)}
            </span>
            <h2 className="break-words text-xl font-bold">{data.fullName}</h2>
          </div>
          <span className={`inline-flex rounded-full px-3 py-2 text-sm ${state === 'active' ? 'bg-lime-soft text-lime' : 'bg-warn-soft text-warn'}`}>
            {labels[state]}
          </span>
          <div className="space-y-2 text-sm text-muted">
            {data.startedOn ? <p>{t('memberSince')} <time dateTime={data.startedOn}>{formatDate(data.startedOn)}</time></p> :
              <p>{t('yourStartDateWillAppearWhen')}</p>}
            <p>{t('until')} <time dateTime={data.accessUntil}>{formatDate(data.accessUntil)}</time></p>
          </div>
          {url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t('messageYourCoachOnWhatsApp')}
            className="flex min-h-14 items-center justify-center gap-2 rounded-control bg-lime px-5 font-extrabold text-on-lime">
            <MessageCircle aria-hidden className="size-5" />{t('messageYourCoachOnWhatsApp')}
          </a> : <Button disabled className="min-h-12 w-full">{t('yourCoachHasnTAddedA')}</Button>}
        </GlassCard>}
    {data && voiceNotes}
    <Link href="/player/settings" className="glass flex min-h-12 items-center justify-center rounded-control px-4">{t('settings')}</Link>
  </main>;
}

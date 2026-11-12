'use client';
import { profileTimezone } from '@/lib/timezone';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { MessageCircle } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { Button, EmptyState, ErrorState, GlassCard, LoadingState } from '@/ui';
import { formatDateAr, localDate } from '@/lib/dates';
import { accessState } from '../access';
import { useCaptainContext } from '../hooks/use-my-captain';
import { whatsappUrl } from '@/lib/whatsapp';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { PlayerAssessments } from './player-assessments-entry';
import { CaptainQuestion } from './captain-question';
import { messages as v6Messages } from '../v6-messages';

const contactPatterns = {
  whatsapp: /^https:\/\/wa\.me\/[1-9]\d{7,14}$/,
  instagram: /^https:\/\/(www\.)?instagram\.com(\/|$)/,
  tiktok: /^https:\/\/(www\.)?tiktok\.com(\/|$)/,
  facebook: /^https:\/\/(www\.)?(facebook\.com|fb\.com)(\/|$)/,
  youtube: /^https:\/\/(www\.)?(youtube\.com|youtu\.be)(\/|$)/,
  x: /^https:\/\/(www\.)?(x\.com|twitter\.com)(\/|$)/,
};

export function CaptainScreen({ voiceNotes }: { voiceNotes?: ReactNode }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled();
  const locale = useLocale();
  const labels = { active: t('subscriptionActive'), ending: t('subscriptionEndingSoon'), ended: t('subscriptionEnded'), archived: t('coachingPaused') };
  const formatDate = (date: string) => formatDateAr(date, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
  const { data, status, retry } = useCaptainContext();
  const state = data ? accessState({ ...data, today: localDate(new Date(), profileTimezone(data.timezone)) }) : 'active';
  const social = Object.fromEntries(Object.entries(data?.social ?? {}).filter(([key, link]) =>
    key in contactPatterns && typeof link === 'string' && contactPatterns[key as keyof typeof contactPatterns].test(link)));
  // Captains who saved only a phone before profile links existed stay reachable on WhatsApp.
  const url = social.whatsapp ?? (data?.phone ? whatsappUrl({ phone: data.phone }) ?? undefined : undefined);
  const profile = status === 'loading' ? <LoadingState variant="detail" /> : status === 'error' ?
      <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')} onRetry={() => void retry()} /> :
      !data ? <EmptyState icon={MessageCircle} title={t('youReNotWorkingWithA')} body={t('yourCoachSDetailsWillAppear')} action={{ label: t('backHome'), href: '/player' }} /> :
        <GlassCard className="space-y-5 p-6">
          <div className="flex items-center gap-4">
            {data.avatarUrl ? <Image src={data.avatarUrl} alt="" width={64} height={64} unoptimized className="size-16 shrink-0 rounded-full object-cover" /> : <span aria-hidden className="glass flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold">
              {data.fullName.trim().slice(0, 1)}
            </span>}
            <h2 className="break-words text-xl font-bold">{data.fullName}</h2>
          </div>
          {data.bio && <p className="whitespace-pre-wrap break-words">{data.bio}</p>}
          {data.location && <p className="text-sm text-muted">{data.location}</p>}
          <div className="flex flex-wrap gap-3">
            {(['instagram', 'tiktok', 'facebook', 'youtube', 'x'] as const).map(key => social[key] ?
              <a key={key} href={social[key]} target="_blank" rel="noopener noreferrer"
                className="glass flex min-h-12 items-center rounded-control px-4">{t(key)}</a> : null)}
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
        </GlassCard>;
  return <main className="mx-auto max-w-lg space-y-5 px-5 pt-6 pb-32">
    {v6 && data ? <header className="flex items-center gap-3">
      {data.avatarUrl ? <Image src={data.avatarUrl} alt="" width={48} height={48} unoptimized className="size-12 rounded-full object-cover" /> :
        <span aria-hidden className="glass flex size-12 items-center justify-center rounded-full text-lg">{data.fullName.trim().slice(0, 1)}</span>}
      <div><h1 className="font-display text-[19px] font-semibold">{data.fullName}</h1><p className="mt-1 text-xs text-faint">{v6t('replyTime')}</p></div>
    </header> : <header><h1 className="text-2xl font-extrabold">{t('coach')}</h1></header>}
    {v6 && data ? <>{voiceNotes}<PlayerAssessments actionable={false} /><CaptainQuestion contactUrl={url} />
      <details className="glass rounded-card border border-line-soft p-4"><summary className="flex min-h-12 cursor-pointer items-center text-sm text-muted">{v6t('profile')}</summary>{profile}</details>
    </> : <>{profile}{data && voiceNotes}</>}
  </main>;
}

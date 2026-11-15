'use client';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import { KoCaptainChat } from '@/ui/icons/ko-captain-chat';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { Button, EmptyState, ErrorState, GlassCard, LoadingState } from '@/ui';
import { daysBetween, formatDateAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { profileTimezone } from '@/lib/timezone';
import { whatsappUrl } from '@/lib/whatsapp';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { accessState } from '../access';
import { useCaptainContext } from '../hooks/use-my-captain';
import type { MyCaptain } from '../data/my-captain';
import { messages } from '../messages';
import { messages as pageMessages } from '../pages-messages';
import { buttonClass } from '@/ui/button';

const contactPatterns = {
  whatsapp: /^https:\/\/wa\.me\/[1-9]\d{7,14}$/,
  instagram: /^https:\/\/(www\.)?instagram\.com(\/|$)/,
  tiktok: /^https:\/\/(www\.)?tiktok\.com(\/|$)/,
  facebook: /^https:\/\/(www\.)?(facebook\.com|fb\.com)(\/|$)/,
  youtube: /^https:\/\/(www\.)?(youtube\.com|youtu\.be)(\/|$)/,
  x: /^https:\/\/(www\.)?(x\.com|twitter\.com)(\/|$)/,
};

export function captainContact(data: MyCaptain | null) {
  const social = Object.fromEntries(Object.entries(data?.social ?? {}).filter(([key, link]) =>
    key in contactPatterns && typeof link === 'string' && contactPatterns[key as keyof typeof contactPatterns].test(link)));
  // Preserve phone-only profiles created before social links existed.
  return { social, url: social.whatsapp ?? (data?.phone ? whatsappUrl({ phone: data.phone }) ?? undefined : undefined) };
}

export function subscriptionProgress(data: Pick<MyCaptain, 'startedOn' | 'accessUntil'>, now: Date, timezone: string) {
  const today = localDate(now, timezone);
  const length = data.startedOn ? daysBetween(data.startedOn, data.accessUntil) : null;
  const percent = length === null ? null : length <= 0 ? (today >= data.accessUntil ? 100 : 0)
    : Math.min(100, Math.max(0, 100 * daysBetween(data.startedOn ?? today, today) / length));
  return { daysLeft: Math.max(0, daysBetween(today, data.accessUntil)), percent };
}

export function CaptainProfileCard({ variant = 'legacy', children }: { variant?: 'legacy' | 'page'; children?: ReactNode }) {
  const t = useT(messages), p = useT(pageMessages);
  const locale = useLocale();
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  const { data, status, retry } = useCaptainContext();
  const page = variant === 'page';
  const formatDate = (date: string) => formatDateAr(date, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
  if (status === 'loading') return <LoadingState variant="detail" />;
  if (status === 'error') return <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')} onRetry={() => void retry()} />;
  if (!data) return <EmptyState icon={MessageCircle} title={t('youReNotWorkingWithA')} body={t('yourCoachSDetailsWillAppear')} action={{ label: t('backHome'), href: '/player' }} />;
  const state = accessState({ ...data, today: localDate(page && now ? now : new Date(), page ? timezone : profileTimezone(data.timezone)) });
  const labels = { active: page ? p('active') : t('subscriptionActive'), ending: t('subscriptionEndingSoon'), ended: t('subscriptionEnded'), archived: t('coachingPaused') };
  const { social, url } = captainContact(data);
  const progress = now ? subscriptionProgress(data, now, timezone) : null;
  const identity = <>
    <div className={page ? 'flex flex-col items-center gap-3' : 'flex items-center gap-4'}>
      {data.avatarUrl ? <Image src={data.avatarUrl} alt="" width={page ? 80 : 64} height={page ? 80 : 64} unoptimized
        className={`${page ? 'size-20' : 'size-16'} shrink-0 rounded-full object-cover`} /> :
        <span aria-hidden className={page ? 'flex size-20 shrink-0 items-center justify-center rounded-full bg-lime-soft text-[30px] font-black text-lime' : 'glass flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold'}>{data.fullName.trim().slice(0, 1)}</span>}
      {page ? <div><h2 className="break-words text-xl font-bold">{data.fullName}</h2>
        {data.location && <p className="mt-1 text-xs text-muted">{data.location}</p>}</div> : <h2 className="break-words text-xl font-bold">{data.fullName}</h2>}
    </div>
    {data.bio && <p className={page ? 'whitespace-pre-wrap break-words text-[13px] leading-[1.7] text-muted' : 'whitespace-pre-wrap break-words'}>{data.bio}</p>}
    {!page && data.location && <p className="text-sm text-muted">{data.location}</p>}
    <div className={page ? 'flex flex-wrap justify-center gap-2' : 'flex flex-wrap gap-3'}>
      {(['instagram', 'tiktok', 'facebook', 'youtube', 'x'] as const).map(key => social[key] ?
        <a key={key} href={social[key]} target="_blank" rel="noopener noreferrer"
          className={buttonClass({ variant: (page) ? 'secondary' : 'secondary', block: false, className: page ? "flex min-h-12 items-center px-3 text-xs" : "flex min-h-12 items-center px-4" })}>{t(key)}</a> : null)}
    </div>
  </>;
  const chip = <span className={`inline-flex rounded-full px-3 py-2 text-sm ${state === 'active' ? 'bg-lime-soft text-lime' : 'bg-warn-soft text-warn'}`}>{labels[state]}</span>;
  const dates = <div className={page ? 'flex flex-wrap justify-between gap-2 text-[13px] text-muted' : 'space-y-2 text-sm text-muted'}>
    {data.startedOn ? <p>{page ? p('memberSince', { date: formatDate(data.startedOn) }) : <>{t('memberSince')} <time dateTime={data.startedOn}>{formatDate(data.startedOn)}</time></>}</p> : <p>{t('yourStartDateWillAppearWhen')}</p>}
    <p>{page ? p('until', { date: formatDate(data.accessUntil) }) : <>{t('until')} <time dateTime={data.accessUntil}>{formatDate(data.accessUntil)}</time></>}</p>
  </div>;
  const contact = url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={page ? p('whatsapp') : t('messageYourCoachOnWhatsApp')}
    className={buttonClass({ variant: (page) ? 'secondary' : 'primary', block: false, className: page ? "flex min-h-12 items-center justify-center gap-2 px-4 text-[13px] font-bold" : "flex min-h-14 items-center justify-center gap-2 px-5 font-extrabold" })}>
    {page ? <KoCaptainChat aria-hidden className="size-[18px]" /> : <MessageCircle aria-hidden className="size-5" />}{page ? p('whatsapp') : t('messageYourCoachOnWhatsApp')}
  </a> : <Button disabled variant={page ? 'secondary' : 'primary'} className="min-h-12 w-full">{t('yourCoachHasnTAddedA')}</Button>;
  if (!page) return <GlassCard className="space-y-5 p-6">{identity}{chip}{dates}{contact}</GlassCard>;
  return <>
    <section className="space-y-3 rounded-[22px] border border-line-soft bg-surface p-5 text-center">{identity}</section>
    <section className="space-y-3 rounded-[22px] border border-line-soft bg-surface p-4">
      <div className="flex items-center justify-between gap-3"><h2 className="text-[15px] font-bold">{p('subscription')}</h2>{chip}</div>
      {dates}
      {progress && progress.percent !== null && <progress aria-label={p('subscription')} value={progress.percent} max={100}
        className="block h-[7px] w-full appearance-none overflow-hidden rounded-full border-0 bg-line [&::-webkit-progress-bar]:bg-line [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-lime [&::-moz-progress-bar]:bg-lime" />}
      {progress && <p className="text-xs text-muted">{p('daysLeft', { n: formatNumber(progress.daysLeft, locale) })}</p>}
    </section>
    {children}{contact}
  </>;
}

'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { chatMessages } from '@/features/chat';
import { useTimezone } from '@/core/timezone/client';
import { daysBetween, localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import type { MyCaptain } from '../data/my-captain';
import { messages } from '../captain-messages';

export function CaptainHeading({ captain }: { captain: MyCaptain }) {
  const t = useT(messages);
  const chatT = useT(chatMessages);
  const locale = useLocale();
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  const days = captain.startedOn && now ? Math.max(0, daysBetween(captain.startedOn, localDate(now, timezone))) : null;
  const unit = days !== null && days >= 365 ? 'year' : days !== null && days >= 30 ? 'month' : 'day';
  const n = Math.floor((days ?? 0) / (unit === 'year' ? 365 : unit === 'month' ? 30 : 1));
  const pairs = { year: 'twoYears', month: 'twoMonths', day: 'twoDays' } as const;
  const duration = days === null ? null : n === 1 ? t(unit) : n === 2 ? t(pairs[unit]) : t(`${unit}s`, { n });
  return <Link href={`/${locale}/player/captain/profile`} className="flex min-h-12 items-center gap-stack">
    {captain.avatarUrl ? <Image src={captain.avatarUrl} alt="" width={52} height={52} unoptimized className="size-[52px] shrink-0 rounded-full object-cover" /> :
      <span aria-hidden className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-lime-soft text-xl font-black text-lime">{captain.fullName.trim().slice(0, 1)}</span>}
    <div className="flex min-w-0 flex-col gap-inline"><h1 className="font-sans text-xl font-black!">{t('captain', { name: captain.fullName })}</h1>
      <p className="text-xs text-muted">{duration && <>{t('since', { duration })}{' · '}</>}{chatT('profile')}</p></div>
    <ChevronLeft aria-hidden className="dir-icon ms-auto size-[18px] shrink-0 text-muted" />
  </Link>;
}

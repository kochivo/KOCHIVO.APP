'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { daysBetween, localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import type { MyCaptain } from '../data/my-captain';
import { messages } from '../captain-messages';
import { messages as pages } from '../pages-messages';
import { secondaryButtonClass } from '@/ui/secondary-button-class';

export function CaptainHeading({ captain }: { captain: MyCaptain }) {
  const t = useT(messages);
  const p = useT(pages);
  const locale = useLocale();
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  const days = captain.startedOn && now ? Math.max(0, daysBetween(captain.startedOn, localDate(now, timezone))) : null;
  const unit = days !== null && days >= 365 ? 'year' : days !== null && days >= 30 ? 'month' : 'day';
  const n = Math.floor((days ?? 0) / (unit === 'year' ? 365 : unit === 'month' ? 30 : 1));
  const pairs = { year: 'twoYears', month: 'twoMonths', day: 'twoDays' } as const;
  const duration = days === null ? null : n === 1 ? t(unit) : n === 2 ? t(pairs[unit]) : t(`${unit}s`, { n });
  return <header className="flex shrink-0 items-center gap-stack">
    <Link href={`/${locale}/player`} aria-label={p('back')} className={`${secondaryButtonClass} size-12 shrink-0 !p-0`}>
      <ChevronLeft aria-hidden className="dir-icon size-5" />
    </Link>
    <div className="flex min-h-12 min-w-0 flex-1 items-center gap-stack">
      {captain.avatarUrl ? <Image src={captain.avatarUrl} alt="" width={44} height={44} unoptimized className="size-11 shrink-0 rounded-full border-2 border-lime object-cover" /> :
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-lime bg-surface-raised font-extrabold">{captain.fullName.trim().slice(0, 1)}</span>}
      <div className="min-w-0 flex-1"><h1 className="break-words text-md font-extrabold">{captain.fullName}</h1>
        <p className="text-micro text-muted">{days === 0 ? t('sinceToday') : duration && t('since', { duration })}</p></div>
    </div>
    <Link href={`/${locale}/player/captain/profile`} aria-label={p('profileTitle')} className={`${secondaryButtonClass} size-12 shrink-0 !p-0`}>
      <CreditCard aria-hidden className="size-5" />
    </Link>
  </header>;
}

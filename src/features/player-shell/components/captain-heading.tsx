'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { chatMessages } from '@/features/chat';
import { useTimezone } from '@/core/timezone/client';
import { daysBetween, localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import type { MyCaptain } from '../data/my-captain';
import { messages } from '../captain-messages';
import { IconButton } from '@/ui/icon-button';

export function CaptainHeading({ captain, onMessage }: { captain: MyCaptain; onMessage?: () => void }) {
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
  return <header className="glass flex items-center gap-stack rounded-card px-card py-stack">
    <Link href={`/${locale}/player/captain/profile`} className="press flex min-h-12 min-w-0 flex-1 items-center gap-stack">
      {captain.avatarUrl ? <Image src={captain.avatarUrl} alt="" width={44} height={44} unoptimized className="size-11 shrink-0 rounded-full border-2 border-lime object-cover" /> :
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-lime bg-surface-raised font-extrabold">{captain.fullName.trim().slice(0, 1)}</span>}
      <div className="min-w-0 flex-1"><h1 className="text-md font-extrabold">{t('captain', { name: captain.fullName })}</h1>
        <p className="text-xs text-muted">{days === 0 ? <>{t('sinceToday')}{' · '}</> : duration && <>{t('since', { duration })}{' · '}</>}{chatT('profile')}</p></div>
      <ChevronLeft aria-hidden className="dir-icon size-4 shrink-0 text-muted" />
    </Link>
    {onMessage && <IconButton aria-label={chatT('placeholder')} onClick={onMessage}><MessageCircle aria-hidden className="size-5" /></IconButton>}
  </header>;
}

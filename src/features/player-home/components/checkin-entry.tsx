'use client';

import Link from 'next/link';
import { CalendarCheck, ChevronLeft } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

// The weekly check-in lives on the Progress tab; this is its labelled doorway
// from Home, opening the same sheet instead of a new flow.
export function CheckinEntry() {
  const t = useT(messages);
  return <Link href="/player/progress?checkin=1" data-home-section="checkin"
    className="press glass flex min-h-12 items-center gap-stack rounded-card p-card">
    <CalendarCheck aria-hidden className="size-5 shrink-0 text-lime" />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold">{t('weeklyCheckinEntry')}</span>
      <span className="block text-xs text-muted">{t('weeklyCheckinHint')}</span>
    </span>
    <ChevronLeft aria-hidden className="size-4 shrink-0 text-faint ltr:rotate-180" />
  </Link>;
}

'use client';

import Link from 'next/link';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

// The weekly check-in lives on the Progress tab; this is its labelled doorway
// from Home, opening the same sheet instead of a new flow.
export function CheckinEntry() {
  const t = useT(messages);
  return <Link href="/player/progress?checkin=1" data-home-section="checkin"
    className="press glass flex min-h-12 items-center rounded-card px-card text-sm font-bold">{t('weeklyCheckinEntry')}</Link>;
}

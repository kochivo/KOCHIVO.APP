'use client';

import Link from 'next/link';
import { useLocale } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { RankBadge } from '@/ui';
import { messages } from '../messages';
import { buttonClass } from '@/ui/button';

export function TeamCrownLink({ locale: suppliedLocale }: { locale?: Locale }) {
  const activeLocale = useLocale();
  const locale = suppliedLocale ?? activeLocale;
  const t = createT(messages, locale);
  return <Link href="/captain/leaderboard" className={buttonClass({ variant: 'secondary', block: false, className: "mb-4 flex min-h-12 items-center gap-3 p-3" })}>
    <RankBadge tier="crown" size="sm" label={t('crown')} />
    <span className="flex-1 font-bold">{t('title')}</span>
  </Link>;
}

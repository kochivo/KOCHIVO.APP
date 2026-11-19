'use client';

import Link from 'next/link';
import { ChevronLeft, Eye } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import { useArabicStyle } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { buttonClass } from '@/ui/button';
import { KoCaptainChat } from '@/ui/icons/ko-captain-chat';
import { messages } from './messages';
import { phoneMessages } from './phone/messages';
import { v11Messages } from './v11-messages';
import { messages as subscriptionMessages } from './subscription-messages';
import type { PlayerFileTab } from './types';
import { FileBillingEntry } from './billing-entry';

export function PhoneFileHeader({ base, playerId, today, name, goal, packageName, remaining, waiting, tab, locale, unreadCount }: {
  base: string; playerId: string; today: string; name: string; goal: string | null; packageName?: string; remaining: number;
  waiting: boolean; tab: PlayerFileTab; locale: Locale; unreadCount: number;
}) {
  const style = useArabicStyle();
  const t = createT(messages, locale, style), phone = createT(phoneMessages, locale, style), vt = createT(v11Messages, locale, style);
  const count = formatNumber(unreadCount, locale);
  const subtitle = [goal, packageName, waiting ? createT(subscriptionMessages, locale, style)('waiting') :
    t('days', { n: remaining, count: formatNumber(remaining, locale) })].filter(Boolean).join(' · ');
  const routes = [
    ['overview', base, phone('overview')], ['training', `${base}/programs`, phone('training')],
    ['nutrition', `${base}/nutrition`, phone('nutrition')], ['checkins', `${base}/checkins`, phone('checkins')],
  ] as const;
  const iconLink = buttonClass({ variant: 'secondary', block: false, className: 'w-12 shrink-0 px-0' });
  const chipClass = (active: boolean) => `press flex min-h-12 shrink-0 items-center whitespace-nowrap rounded-control px-inline text-xs focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime ${active ? 'bg-ink/10 font-bold text-ink' : 'bg-ink/5 text-muted'}`;
  return <div className="space-y-card-gap md:hidden">
    <header className="flex min-h-12 items-center gap-stack">
      <Link href="/captain/players" aria-label={vt('back')} className={iconLink}><ChevronLeft aria-hidden className="dir-icon size-5" /></Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-md font-bold">{name}</h1>
        <p className="text-micro text-muted">{subtitle}</p>
      </div>
      <Link href={`${base}/preview`} prefetch={false} aria-label={t('preview')} className={iconLink}>
        <Eye aria-hidden className="size-5" />
      </Link>
      <Link href={`${base}/chat`} aria-current={tab === 'chat' ? 'page' : undefined}
        aria-label={unreadCount > 0 ? t('chatCount', { count }) : vt('message')} className={iconLink}>
        <KoCaptainChat aria-hidden className="size-5" />
      </Link>
    </header>
    <nav aria-label={t('tabs')} className="flex max-w-full gap-inline overflow-x-auto">
      {routes.map(([key, href, label]) => <Link key={key} href={href} prefetch={false} aria-current={tab === key ? 'page' : undefined}
        className={chipClass(tab === key)}>
        {label}
      </Link>)}
      <FileBillingEntry playerId={playerId} name={name} today={today} triggerLabel={phone('money')} />
      <Link href={`${base}/assessments`} prefetch={false} aria-current={tab === 'assessments' ? 'page' : undefined}
        className={chipClass(tab === 'assessments')}>{t('assessments')}</Link>
    </nav>
  </div>;
}

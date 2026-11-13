import Link from 'next/link';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { daysBetween } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { whatsappUrl } from '@/lib/whatsapp';
import { playerStatus, rosterMessages } from '@/features/roster';
import { UnderlineTabs } from '@/ui/underline-tabs';
import { SaveStatus } from '@/ui/save-status';
import { messages } from './messages';
import type { FileSummary, PlayerFileTab, Profile } from './types';
import { FileBillingEntry } from './billing-entry';
import { TierBadge } from '@/ui/tier-badge';

export function FileHeader({ playerId, profile, summary, tab, locale, today, playerToday }: {
  playerId: string; profile: Profile; summary: FileSummary; tab: PlayerFileTab; locale: Locale; today: string; playerToday?: string;
}) {
  const t = createT(messages, locale), rt = createT(rosterMessages, locale);
  const base = `/captain/players/${playerId}`;
  const status = playerStatus({ accessUntil: summary.subscription.access_until, startedOn: summary.subscription.started_on,
    lastTrainingDate: summary.lastTraining, today, playerToday });
  const statusLabels = { active: 'active', late: 'late', ending: 'endingSoon', grace: 'gracePeriod', expired: 'expired' } as const;
  const whatsapp = profile.phone ? whatsappUrl({ phone: profile.phone }) : null;
  return <>
    <header className="flex flex-wrap items-center gap-3">
      {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={52} height={52} unoptimized className="size-[52px] shrink-0 rounded-full object-cover" /> :
        <span aria-hidden className="glass-strong grid size-[52px] shrink-0 place-items-center rounded-full text-lg">{profile.name.charAt(0)}</span>}
      <div className="relative min-w-0 pt-5"><Link href="/captain/players" className="absolute -top-4 start-0 flex min-h-12 items-center whitespace-nowrap text-xs text-lime hover:underline focus-visible:underline">{t('breadcrumb')}</Link>
        <h1 className="flex flex-wrap items-center gap-2 break-words font-display text-[30px] font-semibold leading-tight">{profile.name}<TierBadge tier={summary.tier} /></h1></div>
      <span className={`rounded-full px-3 py-1 text-xs ${status === 'active' && !summary.subscription.pending && !summary.subscription.frozen_at ? 'bg-lime-soft text-lime' : 'bg-warn-soft text-warn'}`}>
        {summary.subscription.pending ? t('pending') : summary.subscription.frozen_at ? t('frozen') : rt(statusLabels[status])}</span>
      {summary.subscription.sessions_left !== null && <span className="text-xs text-muted">{t('sessions', { count: formatNumber(summary.subscription.sessions_left, locale) })}</span>}
      <span className="ms-auto text-[13px] text-muted">{t('days', { count: formatNumber(daysBetween(today, summary.subscription.access_until), locale) })}</span>
      <FileBillingEntry playerId={playerId} name={profile.name} today={today} />
      <Link href={`${base}/preview`} prefetch={false} className="glass inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm"><Eye aria-hidden className="size-4" />{t('preview')}</Link>
      {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="glass inline-flex min-h-12 items-center rounded-full border border-line px-4 text-xs text-ink">{t('whatsapp')}</a>}
      {tab === 'training' && <SaveStatus status="saved" locale={locale} />}
    </header>
    <UnderlineTabs label={t('tabs')} items={([
      ['overview', base], ['training', `${base}/programs`], ['nutrition', `${base}/nutrition`],
      ['assessments', `${base}/assessments`], ['checkins', `${base}/checkins`],
    ] as const).map(([key, href]) => ({ href, label: t(key), active: tab === key }))} />
  </>;
}

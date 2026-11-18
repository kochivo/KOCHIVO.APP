import { buttonClass, clickableClass } from '@/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { daysBetween } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { StatStrip } from '@/ui/stat-strip';
import { FileTabs } from './file-tabs';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { KoCaptainChat } from '@/ui/icons/ko-captain-chat';
import { messages } from './messages';
import { v11Messages } from './v11-messages';
import type { FileSummary, PlayerFileTab, Profile } from './types';
import { ArchiveMenu } from './archive-menu';
import { ranksMessages } from '@/features/ranks/server';
import { PlayerMedalChip } from './rank-chip';
import { archivePlayer, rosterMessages } from '@/features/roster/server';
import { messages as subscriptionMessages } from './subscription-messages';
import { SubscriptionWaitEntry } from './subscription-wait-entry';
import { PhoneFileHeader } from './phone-file-header';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function FileHeader({ playerId, profile, summary, tab, locale, today, unreadCount = 0 }: {
  playerId: string; profile: Profile; summary: FileSummary; tab: PlayerFileTab; locale: Locale; today: string; playerToday?: string; unreadCount?: number;
}) {
  const t = createT(messages, locale), vt = createT(v11Messages, locale);
  const rt = createT(rosterMessages, locale);
  const base = `/captain/players/${playerId}`;
  const Back = locale === 'en' ? ArrowLeft : ArrowRight;
  const initial = profile.intake?.weightKg, target = summary.file.facts.targetWeight?.value;
  const goal = initial !== undefined && target != null ? t(target < initial ? 'lose' : target > initial ? 'gain' : 'maintain') : null;
  const subtitle = [goal, summary.subscription.awaiting_plans_at ? createT(subscriptionMessages, locale)('waiting') : t('days', { count: formatNumber(Math.max(0, daysBetween(today, summary.subscription.access_until)), locale) }), summary.rank ? createT(ranksMessages, locale)(summary.rank) : null].filter(Boolean).join(' · ');
  const weight = summary.file.facts.weight?.value;
  const remaining = Math.max(0, daysBetween(today, summary.subscription.access_until));
  const planned = summary.file.facts.trainingDays?.value.length ?? profile.program?.days ?? 0;
  const phone = captainWorkspaceEnabled();
  return <>
    <PageBarTitle title={profile.name} subtitle={subtitle} />
    <PageBarActions>
      <Link href="/captain/players" aria-label={vt('back')} className={`${clickableClass} glass press grid min-h-12 min-w-12 cursor-pointer place-items-center rounded-full border border-line focus-visible:ring-2 focus-visible:ring-lime${phone ? ' max-md:hidden' : ''}`}><Back aria-hidden className="size-5" /></Link>
      <Link href={`${base}/preview`} prefetch={false} className={`${clickableClass} glass press hidden min-h-12 cursor-pointer items-center gap-inline rounded-full border border-line px-page-x text-sm focus-visible:ring-2 focus-visible:ring-lime min-[760px]:inline-flex`}><Eye aria-hidden className="size-4" />{t('preview')}</Link>
      <Link href={`${base}/chat`} aria-label={vt('message')} className={buttonClass({ variant: 'primary', block: false, className: phone ? 'max-md:hidden' : undefined })}><KoCaptainChat className="size-5" /><span className="hidden min-[760px]:inline">{vt('message')}</span></Link>
      <ArchiveMenu playerId={playerId} archive={archivePlayer} confirmText={rt('archiveTheyllBeRemovedFromThePlayer', { v0: profile.name })}
        archivingText={rt('archiving')} errorText={rt('couldntArchiveTryAgain')} />
    </PageBarActions>
    {phone && <PhoneFileHeader base={base} playerId={playerId} today={today} name={profile.name} goal={goal} packageName={summary.tier?.name}
      remaining={remaining} waiting={Boolean(summary.subscription.awaiting_plans_at)} tab={tab} locale={locale} unreadCount={unreadCount} />}
    <section className={phone ? 'glass grid items-center gap-card-gap rounded-card p-card min-[760px]:grid-cols-2 max-md:hidden' : 'glass grid items-center gap-card-gap rounded-card p-card min-[760px]:grid-cols-2'}>
      <div className="flex min-w-0 items-center gap-stack">
        {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={64} height={64} unoptimized className="size-16 shrink-0 rounded-full border-2 border-lime object-cover" /> :
          <span aria-hidden className="glass-strong grid size-16 shrink-0 place-items-center rounded-full border-2 border-lime text-title font-bold">{profile.name.charAt(0)}</span>}
        <div className="min-w-0 space-y-inline">
          <h2 className="break-words text-title font-bold">{profile.name}</h2>
          {profile.program?.title && <p className="text-xs text-muted">{profile.program.title}</p>}
          <div className="flex flex-wrap items-center gap-inline">
            {goal && <span className="tone-neutral rounded-md px-inline text-micro font-semibold">{goal}</span>}
            {summary.lifetime !== undefined && <PlayerMedalChip lifetime={summary.lifetime} locale={locale} />}
          </div>
        </div>
      </div>
      <StatStrip items={[
        ...(weight == null ? [] : [{ label: t("weight"), value: formatNumber(weight, locale), unit: t("kg"), tone: "lime" as const }]),
        ...(planned > 0 ? [{ label: t("adherence"), value: `${formatNumber(Math.round(summary.completedDays / planned * 100), locale)}%` }] : []),
        { label: t("training"), value: formatNumber(summary.completedDays, locale) },
        { label: t("subscription"), value: formatNumber(remaining, locale), unit: t("dayUnit"), tone: "warn" },
      ]} />
    </section>
    <FileTabs desktopOnly={phone} label={t('tabs')} items={([
      ['overview', base], ['training', `${base}/programs`], ['nutrition', `${base}/nutrition`],
      ['checkins', `${base}/checkins`], ['assessments', `${base}/assessments`], ['chat', `${base}/chat`],
    ] as const).map(([key, href]) => ({ href, label: key === 'chat' && unreadCount > 0 ? t('chatCount', { count: formatNumber(unreadCount, locale) }) : t(key), active: tab === key }))} />
    {summary.subscription.awaiting_plans_at && summary.subscription.id && <SubscriptionWaitEntry
      linkId={summary.subscription.id} training={summary.plansReady?.training ?? false} nutrition={summary.plansReady?.nutrition ?? false} />}
  </>;
}

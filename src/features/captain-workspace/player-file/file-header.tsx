import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { daysBetween } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { FileTabs } from './file-tabs';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { KoCaptainChat } from '@/ui/icons/ko-captain-chat';
import { messages } from './messages';
import { v11Messages } from './v11-messages';
import type { FileSummary, PlayerFileTab, Profile } from './types';
import { ArchiveMenu } from './archive-menu';
import { ranksMessages } from '@/features/ranks/server';
import { archivePlayer, rosterMessages } from '@/features/roster/server';

export function FileHeader({ playerId, profile, summary, tab, locale, today, unreadCount = 0 }: {
  playerId: string; profile: Profile; summary: FileSummary; tab: PlayerFileTab; locale: Locale; today: string; playerToday?: string; unreadCount?: number;
}) {
  const t = createT(messages, locale), vt = createT(v11Messages, locale);
  const rt = createT(rosterMessages, locale);
  const base = `/captain/players/${playerId}`;
  const Back = locale === 'en' ? ArrowLeft : ArrowRight;
  const initial = profile.intake?.weightKg, target = summary.file.facts.targetWeight?.value;
  const goal = initial !== undefined && target != null ? t(target < initial ? 'lose' : target > initial ? 'gain' : 'maintain') : null;
  const subtitle = [goal, t('days', { count: formatNumber(Math.max(0, daysBetween(today, summary.subscription.access_until)), locale) }), summary.rank ? createT(ranksMessages, locale)(summary.rank) : null].filter(Boolean).join(' · ');
  return <>
    <PageBarTitle title={profile.name} subtitle={subtitle} />
    <PageBarActions>
      <Link href="/captain/players" aria-label={vt('back')} className="glass press grid min-h-12 min-w-12 cursor-pointer place-items-center rounded-full border border-line focus-visible:ring-2 focus-visible:ring-lime"><Back aria-hidden className="size-5" /></Link>
      {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-full object-cover" /> :
        <span aria-hidden className="glass-strong grid size-12 shrink-0 place-items-center rounded-full text-lg">{profile.name.charAt(0)}</span>}
      <Link href={`${base}/preview`} prefetch={false} className="glass press hidden min-h-12 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm focus-visible:ring-2 focus-visible:ring-lime min-[760px]:inline-flex"><Eye aria-hidden className="size-4" />{t('preview')}</Link>
      <Link href={`${base}/chat`} aria-label={vt('message')} className="glass press inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-3 text-sm focus-visible:ring-2 focus-visible:ring-lime"><KoCaptainChat className="size-5" /><span className="hidden min-[760px]:inline">{vt('message')}</span></Link>
      <ArchiveMenu playerId={playerId} archive={archivePlayer} confirmText={rt('archiveTheyllBeRemovedFromThePlayer', { v0: profile.name })}
        archivingText={rt('archiving')} errorText={rt('couldntArchiveTryAgain')} />
    </PageBarActions>
    <FileTabs label={t('tabs')} items={([
      ['overview', base], ['training', `${base}/programs`], ['nutrition', `${base}/nutrition`],
      ['checkins', `${base}/checkins`], ['assessments', `${base}/assessments`], ['chat', `${base}/chat`],
    ] as const).map(([key, href]) => ({ href, label: key === 'chat' && unreadCount > 0 ? t('chatCount', { count: formatNumber(unreadCount, locale) }) : t(key), active: tab === key }))} />
  </>;
}

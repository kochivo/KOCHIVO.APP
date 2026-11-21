'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useArabicStyle } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { actionTimezone } from '@/core/timezone/action-timezone';
import { daysBetween, formatDateAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { Segmented } from '@/ui/segmented';
import { buttonClass } from '@/ui/button';
import { messages } from '../messages';
import { currentMonth, nextMonth } from '../months';
import type { LeaderboardScreen } from './leaderboard-screen';
import { rankingRows } from './ranking-rows';
import { WorkspaceBoardList } from './workspace-board-list';
import { WorkspaceLeaderCard } from './workspace-leader-card';
import { WorkspacePointsRules } from './workspace-points-rules';
import { WorkspacePrizes } from './workspace-prizes';
import { workspaceMessages } from './workspace/messages';
import { phoneMessages } from './phone/messages';

type Board = ComponentProps<typeof LeaderboardScreen>['board'];

export function WorkspaceLeaderboard({ locale, board }: ComponentProps<typeof LeaderboardScreen>) {
  const style = useArabicStyle();
  const t = createT(messages, locale, style);
  const copy = createT(workspaceMessages, locale, style);
  const phone = createT(phoneMessages, locale, style);
  const [allTime, setAllTime] = useState(false);
  const [previous, setPrevious] = useState<Pick<Board, 'rows' | 'prize'>>();
  const zone = actionTimezone();
  const current = board.now ? currentMonth(board.now, zone) : board.month;
  const next = nextMonth(current);
  const { month, setMonth } = board;
  useEffect(() => {
    if (month !== current && month !== next) setMonth(current);
  }, [current, month, next, setMonth]);
  const active = board.month === current ? board : previous;
  const rows = active?.rows && rankingRows(active.rows, allTime);
  const leader = rows?.find(row => (allTime ? row.lifetime : row.monthly) > 0);
  const daysLeft = board.now ? daysBetween(localDate(board.now, zone), next) - 1 : 0;
  const subtitle = board.now ? copy(daysLeft === 0 ? 'monthSummaryToday' : 'monthSummary', {
    n: daysLeft,
    month: formatDateAr(current, { month: 'long' }, locale),
    days: formatNumber(daysLeft, locale),
  }) : undefined;
  const options = [{ value: 'thisMonth', label: t('thisMonth') }, { value: 'allTime', label: t('allTime') }] as const;
  const period = {
    'aria-label': t('workspaceTitle'), options, value: allTime ? 'allTime' : 'thisMonth',
    onChange: (value: string) => setAllTime(value === 'allTime'),
  };
  function openNext() {
    setPrevious({ rows: board.rows, prize: board.prize });
    board.setMonth(next);
  }
  function closeNext() { board.setMonth(current); }

  return <div className="space-y-card-gap pb-card">
    <PageBarTitle title={t('workspaceTitle')} subtitle={subtitle} phoneHide />
    <PageBarActions>
      <Segmented {...period} className="hidden shrink-0 whitespace-nowrap md:flex" />
    </PageBarActions>
    <header className="flex min-h-12 items-center gap-stack md:hidden">
      <Link href="/captain/players" aria-label={phone('back')}
        className={buttonClass({ variant: 'secondary', block: false, className: 'w-12 shrink-0 px-0' })}>
        <ChevronLeft aria-hidden className="dir-icon size-5" />
      </Link>
      <div><h1 className="text-md font-bold">{t('workspaceTitle')}</h1>
        <p className="text-xs text-muted">{formatDateAr(current, { month: 'long' }, locale)}</p>
      </div>
    </header>
    <Segmented {...period} className="w-fit max-w-full flex-nowrap whitespace-nowrap md:hidden" />
    <div className="grid items-start gap-card-gap min-[960px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-card-gap">
        {board.month === current && board.error ?
          <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={board.reload} /> : !rows ?
          <LoadingState variant="cards" /> : <>
            {leader && <WorkspaceLeaderCard row={leader} locale={locale} allTime={allTime} />}
            <WorkspaceBoardList rows={rows} locale={locale} allTime={allTime} phoneLeader={leader} />
            {rows.some(row => (allTime ? row.lifetime : row.monthly) === 0) &&
              <p className="text-xs text-muted">{copy('zeroNote')}</p>}
          </>}
      </div>
      <div className="min-w-0 space-y-card-gap">
        {board.now && (active?.rows || board.month === next) &&
          <WorkspacePrizes locale={locale} board={board} current={current} currentPrize={active?.prize ?? null}
            openNext={openNext} closeNext={closeNext} />}
        <WorkspacePointsRules locale={locale} />
      </div>
    </div>
  </div>;
}

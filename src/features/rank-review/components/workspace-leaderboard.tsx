'use client';

import { Segmented } from '@/ui/segmented';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { createT } from '@/core/i18n/messages';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { messages } from '../messages';
import { canEditPrize } from '../data/save-crown-prize';
import { currentMonth } from '../months';
import type { LeaderboardScreen } from './leaderboard-screen';
import { CrownPrizeEditor } from './crown-prize-editor';
import { Podium } from './podium';
import { WorkspaceBoardList } from './workspace-board-list';
import { rankingRows } from './ranking-rows';
import { PrizeMonthControl } from './prize-month-control';

export function WorkspaceLeaderboard({ locale, board }: ComponentProps<typeof LeaderboardScreen>) {
  const t = createT(messages, locale);
  const [allTime, setAllTime] = useState(false);
  const rows = board.rows && rankingRows(board.rows, allTime);
  const podiumRows = rows?.filter(row => (allTime ? row.lifetime : row.monthly) > 0).slice(0, 3) ?? [];
  const remaining = rows?.filter(row => !podiumRows.includes(row)) ?? [];
  return <div className="space-y-card-gap pb-card">
    <PageBarTitle title={t('workspaceTitle')} />
    <PageBarActions>
      <Segmented className="hidden min-[760px]:flex" aria-label={t('workspaceTitle')} value={allTime ? 'allTime' : 'thisMonth'}
        options={[{ value: 'thisMonth', label: t('thisMonth') }, { value: 'allTime', label: t('allTime') }]}
        onChange={value => { setAllTime(value === 'allTime'); if (board.now) board.setMonth(currentMonth(board.now)); }} />
    </PageBarActions>
    {board.now && board.savePrize && <div className="flex justify-end">
      <PrizeMonthControl locale={locale} now={board.now} month={board.month}
        onChange={month => { setAllTime(false); board.setMonth(month); }} />
    </div>}
    {board.error ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={board.reload} /> : !rows ?
      <LoadingState variant="cards" /> : <>
        <div className={podiumRows.length > 0 && remaining.length ? 'grid items-start gap-card-gap min-[760px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]' : undefined}>
          <Podium rows={podiumRows} locale={locale} allTime={allTime}>
            {!allTime && board.prize && <p className="ko-strip cut-corner mt-card-gap p-stack text-sm">{t("prize", { prize: board.prize })}</p>}
          </Podium>
          {(!rows.length || remaining.length > 0) && <WorkspaceBoardList rows={remaining} locale={locale} allTime={allTime} startAt={podiumRows.length} />}
        </div>
        {board.now && board.savePrize && canEditPrize(board.month, board.now) &&
          <CrownPrizeEditor key={board.month} locale={locale} prize={board.prize ?? null} onSave={board.savePrize}
            saving={board.prizeSaving} error={board.prizeError} />}
      </>}
  </div>;
}

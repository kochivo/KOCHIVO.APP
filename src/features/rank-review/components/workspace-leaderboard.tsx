'use client';

import { clickableClass } from '@/ui/button';
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
  return <div className="space-y-4 pb-5">
    <PageBarTitle title={t('workspaceTitle')} />
    <PageBarActions>
      <div className="hidden items-center gap-1 rounded-full border border-line bg-surface p-[3px] min-[760px]:flex">
        {(['thisMonth', 'allTime'] as const).map((key, index) => <button key={key} type="button"
          aria-pressed={allTime === Boolean(index)}
          onClick={() => { setAllTime(Boolean(index)); if (board.now) board.setMonth(currentMonth(board.now)); }}
          className={`${clickableClass} min-h-12 rounded-full px-3 text-xs font-bold ${allTime === Boolean(index) ? 'glass-strong text-ink' : 'text-muted'}`}>
          {t(key)}
        </button>)}
      </div>
    </PageBarActions>
    {board.now && board.savePrize && <div className="flex justify-end">
      <PrizeMonthControl locale={locale} now={board.now} month={board.month}
        onChange={month => { setAllTime(false); board.setMonth(month); }} />
    </div>}
    {board.error ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={board.reload} /> : !rows ?
      <LoadingState variant="cards" /> : <>
        <Podium rows={rows} locale={locale} />
        <WorkspaceBoardList rows={rows} locale={locale} allTime={allTime} />
        {board.now && board.savePrize && canEditPrize(board.month, board.now) &&
          <CrownPrizeEditor key={board.month} locale={locale} prize={board.prize ?? null} onSave={board.savePrize}
            saving={board.prizeSaving} error={board.prizeError} />}
      </>}
  </div>;
}

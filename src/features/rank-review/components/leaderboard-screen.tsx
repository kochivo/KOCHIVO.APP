import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { ErrorState, LoadingState, PageContainer } from '@/ui';
import { messages } from '../messages';
import { BoardList } from './board-list';
import { CrownCard } from './crown-card';
import { MonthSwitch } from './month-switch';
import { CrownPrizeEditor } from './crown-prize-editor';
import { canEditPrize } from '../data/save-crown-prize';
import { currentMonth, nextMonth } from '../months';

export function LeaderboardScreen({ locale, board }: {
  locale: Locale;
  board: { now?: Date; month: string; rows?: LeaderboardRow[]; error: boolean;
    prize?: string | null; savePrize?: (value: string | null) => Promise<void>; prizeSaving?: boolean; prizeError?: boolean;
    setMonth: (month: string) => void; reload: () => void };
}) {
  const t = createT(messages, locale);
  return <PageContainer><div className="space-y-5">
    <h1 className="text-2xl font-bold">{t('title')}</h1>
    {board.now && board.month && <MonthSwitch locale={locale} now={board.now} month={board.month} onChange={board.setMonth} />}
    {board.now && board.savePrize && board.month === currentMonth(board.now) &&
      <button type="button" className="min-h-12 rounded-xl px-4 text-lime"
        onClick={() => board.setMonth(nextMonth(board.month))}>{t('next')}</button>}
    {board.error ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={board.reload} />
      : !board.rows ? <LoadingState variant="cards" /> : <>
        <CrownCard holder={board.rows.find(row => row.is_crown)} locale={locale} />
        {board.now && board.savePrize && canEditPrize(board.month, board.now) &&
          <CrownPrizeEditor key={board.month} locale={locale} prize={board.prize ?? null} onSave={board.savePrize}
            saving={board.prizeSaving} error={board.prizeError} />}
        <BoardList rows={board.rows} locale={locale} />
      </>}
  </div></PageContainer>;
}

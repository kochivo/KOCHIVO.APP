import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { ErrorState, LoadingState, PageContainer } from '@/ui';
import { messages } from '../messages';
import type { PendingWorkout } from '../types';
import { BoardList } from './board-list';
import { CrownCard } from './crown-card';
import { MonthSwitch } from './month-switch';
import { PendingList } from './pending-list';

export function LeaderboardScreen({ locale, board, pending }: {
  locale: Locale;
  board: { now?: Date; month: string; rows?: LeaderboardRow[]; error: boolean;
    setMonth: (month: string) => void; reload: () => void };
  pending: { rows?: PendingWorkout[]; error: boolean; decisionError: boolean; busy: boolean;
    reload: () => void; decide: (id: string, approve: boolean) => void };
}) {
  const t = createT(messages, locale);
  return <PageContainer><div className="space-y-5">
    <h1 className="text-2xl font-bold">{t('title')}</h1>
    {board.now && board.month && <MonthSwitch locale={locale} now={board.now} month={board.month} onChange={board.setMonth} />}
    {pending.error ? <ErrorState message={t('pendingError')} retryLabel={t('retry')} onRetry={pending.reload} />
      : !pending.rows ? <LoadingState variant="list" />
        : <PendingList rows={pending.rows} locale={locale} onDecision={pending.decide} disabled={pending.busy} />}
    {pending.decisionError && <p role="alert" className="text-danger">{t('decisionError')}</p>}
    {board.error ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={board.reload} />
      : !board.rows ? <LoadingState variant="cards" /> : <>
        <CrownCard holder={board.rows.find(row => row.is_crown)} locale={locale} />
        <BoardList rows={board.rows} locale={locale} />
      </>}
  </div></PageContainer>;
}

'use client';

import { useT } from '@/core/i18n/client';
import { ErrorState, LoadingState } from '@/ui';
import { messages } from '../messages';
import { useRankData } from '../hooks/use-rank-data';
import type { RankData, RankStatus } from '../hooks/use-rank-data';
import { useLevelUp } from '../hooks/use-level-up';
import { tierFor } from '../tiers';
import { RankHero } from './rank-hero';
import { RankJourney } from './rank-journey';
import { CrownRace } from './crown-race';
import { TeamBoard } from './team-board';
import { PointsLog } from './points-log';
import { LevelUpPanel } from './level-up-panel';

export function RankScreen({ data, status, onRetry, playerId }: {
  data?: RankData; status?: RankStatus; onRetry?: () => void; playerId?: string;
}) {
  const t = useT(messages);
  const loaded = useRankData(true, status === undefined && data === undefined);
  const active = data ?? loaded.data;
  const state = status ?? (data ? 'ready' : loaded.status);
  const { celebration, dismiss } = useLevelUp(state === 'ready' && active ? tierFor(active.points.lifetime) : undefined, playerId);
  return <main className="mx-auto max-w-lg space-y-4 px-5 pt-6 pb-32">
    <h1 id="rank-title" tabIndex={-1} className="text-2xl font-extrabold">{t('pageTitle')}</h1>
    {state === 'error' ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={onRetry ?? loaded.retry} /> :
      state === 'loading' || !active ? <LoadingState variant="cards" /> : <>
        <RankHero lifetime={active.points.lifetime} />
        <RankJourney lifetime={active.points.lifetime} />
        <CrownRace points={active.points} holdsCrown={active.board.some(row => row.player_id !== null && row.is_crown)} />
        {active.points.month_position !== null && <TeamBoard rows={active.board} />}
        <PointsLog logs={active.points.logs} />
      </>}
    {celebration && <LevelUpPanel tier={celebration} onClose={dismiss} />}
  </main>;
}

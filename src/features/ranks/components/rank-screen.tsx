'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { ErrorState, LoadingState } from '@/ui';
import { buttonClass } from '@/ui/button';
import { messages } from '../messages';
import { messages as v4Messages } from '../player-v4/messages';
import { useRankData } from '../hooks/use-rank-data';
import type { RankData, RankStatus } from '../hooks/use-rank-data';
import { useMedalCelebration } from '../hooks/use-medal-celebration';
import { RankHero } from './rank-hero';
import { RankJourney } from './rank-journey';
import { CrownRace } from './crown-race';
import { TeamBoard } from './team-board';
import { HallOfFame } from './hall-of-fame';
import { PointsLog } from './points-log';
import { MedalUnlock } from './medal-unlock';
import { MedalSets } from './medal-sets';
import { EarnPoints } from './earn-points';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { RankV6 } from './rank-v6';

export function RankScreen({ data, status, onRetry, playerId }: {
  data?: RankData; status?: RankStatus; onRetry?: () => void; playerId?: string;
}) {
  const t = useT(messages);
  const v4t = useT(v4Messages);
  const v4 = captainWorkspaceEnabled();
  const locale = useLocale();
  const loaded = useRankData(true, status === undefined && data === undefined);
  const active = data ?? loaded.data;
  const state = status ?? (data ? 'ready' : loaded.status);
  const ready = state === 'ready' && active ? active.points.lifetime : undefined;
  const { celebration, dismiss } = useMedalCelebration(playerId, ready, active?.medals);
  const holdsCrown = active?.board.some(row => row.player_id !== null && row.is_crown) ?? false;
  return <main className={v4 ? 'mx-auto max-w-lg space-y-card-gap px-page-x pt-card pb-32' : 'mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32'}>
    {v4 ? <header className="flex min-h-12 items-center gap-inline">
      <Link href="/player/progress" aria-label={v4t('back')} className={buttonClass({ variant: 'secondary', className: 'size-12 shrink-0 px-0' })}><ChevronRight aria-hidden className="dir-icon size-5" /></Link>
      <div className="min-w-0"><h1 id="rank-title" tabIndex={-1} className="text-title font-bold">{t('pageTitle')}</h1>
        <p className="text-xs text-muted">{v4t('season')}</p></div>
    </header> : <h1 id="rank-title" tabIndex={-1} className="text-2xl font-extrabold">{t('pageTitle')}</h1>}
    {state === 'error' ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={onRetry ?? loaded.retry} /> :
      state === 'loading' || !active ? <LoadingState variant="cards" /> : v4
        ? <RankV6 data={active} holdsCrown={holdsCrown} retry={onRetry ?? loaded.retry} /> : <>
        <RankHero lifetime={active.points.lifetime} holdsCrown={holdsCrown} weekly={active.weekly} />
        <RankJourney lifetime={active.points.lifetime} />
        {active.medals && <MedalSets counts={active.medals} />}
        <EarnPoints logs={active.points.logs} />
        <CrownRace points={active.points} holdsCrown={holdsCrown} />
        {active.points.month_position !== null && <TeamBoard rows={active.board} />}
        <HallOfFame locale={locale} rows={active.hall} error={active.hallError} onRetry={onRetry ?? loaded.retry} />
        <PointsLog logs={active.points.logs} />
      </>}
    {celebration && <MedalUnlock key={celebration.id} item={celebration} onClose={dismiss} />}
  </main>;
}

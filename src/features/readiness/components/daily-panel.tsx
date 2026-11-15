'use client';

import dynamic from 'next/dynamic';
import { Activity } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ErrorState, LoadingState } from '@/ui';
import { useDailyCheck } from '../hooks/use-daily-check';
import { waterGoalMl } from '../water';
import { messages } from '../messages';
import { WaterStrip } from './water-strip';
import { ReadinessRow } from './readiness-row';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { MorningResult } from './morning-result';

const RestHero = dynamic(() => import('./rest-hero').then(module => module.RestHero));
const MorningQuestions = dynamic(() => import('./morning-questions').then(module => module.MorningQuestions));
const WaterGlass = dynamic(() => import('./water-glass').then(module => module.WaterGlass));

export function DailyPanel({ playerId, today, rest, coachRest, tomorrow, tomorrowRest, weightKg }: {
  playerId?: string; today: string; rest: boolean; coachRest?: boolean; tomorrow?: string; tomorrowRest?: boolean; weightKg?: number;
}) {
  const t = useT(messages);
  const check = useDailyCheck(playerId, today);
  const goal = waterGoalMl(weightKg);
  return <div className="space-y-card-gap">
    {rest && <RestHero coachRest={coachRest} />}
    {check.error && <ErrorState message={t('saveError')} retryLabel={t('retry')} onRetry={check.retry} />}
    {check.row === undefined ? <LoadingState variant="detail" /> : <>
      {rest ? <>
        <MorningQuestions row={check.row} onChange={patch => void check.save(patch)} disabled={!playerId} />
        {captainWorkspaceEnabled() && <MorningResult row={check.row} goal={goal} />}
        <WaterGlass waterMl={check.row?.water_ml ?? 0} goal={goal} onAdd={() => void check.save({}, 250)} disabled={!playerId} />
        <p className="flex items-center gap-inline text-sm text-muted"><Activity aria-hidden className="size-5 text-sore" />{t('stretch')}</p>
        {tomorrowRest ? <p className="text-sm text-muted">{t('tomorrowRest')}</p> :
          tomorrow && <p className="text-sm text-muted">{t('tomorrow', { name: tomorrow })}</p>}
      </> : <>
        <WaterStrip waterMl={check.row?.water_ml ?? 0} goal={goal} onAdd={() => void check.save({}, 250)} disabled={!playerId} />
        <ReadinessRow row={check.row} goal={goal} onChange={patch => void check.save(patch)} />
      </>}
      {check.saved && <p role="status" className="text-sm text-muted">{t(check.pending ? 'savedLocal' : 'sent')}</p>}
    </>}
  </div>;
}

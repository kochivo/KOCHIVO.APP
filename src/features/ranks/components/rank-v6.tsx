'use client';

import { Award, ChevronDown } from 'lucide-react';
import { clickableClass } from '@/ui/button';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import type { RankData } from '../hooks/use-rank-data';
import { messages } from '../messages';
import { messages as v6Messages } from '../v6-messages';
import { RankHero } from './rank-hero';
import { CrownRace } from './crown-race';
import { TeamBoard } from './team-board';
import { HallOfFame } from './hall-of-fame';
import { RankJourney } from './rank-journey';
import { PointsLog } from './points-log';
import { MedalSets } from './medal-sets';
import { EarnPoints } from './earn-points';
import { RankPointSources } from './rank-point-sources';

export function RankV6({ data, holdsCrown, retry }: { data: RankData; holdsCrown: boolean; retry: () => void }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const locale = useLocale();
  const holderName = data.board.find(row => row.is_crown)?.display_name.trim().split(/\s+/)[0];
  const gapWorkouts = data.points.crown_needs_workouts;
  return <>
    <RankHero lifetime={data.points.lifetime} holdsCrown={holdsCrown} weekly={data.weekly} />
    <section data-rank-section="board" className="glass overflow-hidden rounded-card border border-line-soft">
      <header className="flex flex-wrap items-center justify-between gap-inline px-page-x pt-card pb-inline">
        <h2 className="font-display text-title font-semibold">{t('race')}</h2>
      </header><TeamBoard rows={data.board} />
      <p className="px-page-x pb-card text-xs text-muted">{holdsCrown ? t('holder') : holderName && gapWorkouts !== null && gapWorkouts > 0
        ? t('crownWorkouts', { n: formatNumber(gapWorkouts, locale), name: holderName })
        : t('gap', { n: formatNumber(data.points.crown_gap, locale) })}</p>
    </section>
    <section data-rank-section="points" className="space-y-stack">
      <RankPointSources logs={data.points.logs} />
      <PointsLog logs={data.points.logs} />
      <EarnPoints logs={data.points.logs} />
    </section>
    {data.medals && <div data-rank-section="medals"><MedalSets counts={data.medals} /></div>}
    {data.points.crown_prize && <p className="tone-lime rounded-card border border-lime/20 px-card py-stack text-sm">{v6t('prize', { prize: data.points.crown_prize })}</p>}
    <RankJourney lifetime={data.points.lifetime} />
    <details className="group glass rounded-card border border-line-soft px-page-x py-inline"><summary className={`${clickableClass} flex min-h-16 items-center gap-stack rounded-control`}>
      <Award aria-hidden className="size-5 text-muted" /><span className="flex-1">{t('hallTitle')}</span><ChevronDown aria-hidden className="size-4 text-faint group-open:rotate-180" />
    </summary><div className="pb-card"><HallOfFame locale={locale} rows={data.hall} error={data.hallError} onRetry={retry} /></div></details>
    <details className="group glass rounded-card border border-line-soft p-card"><summary className={`${clickableClass} flex min-h-12 items-center gap-inline rounded-control`}><span className="flex-1">{v6t('details')}</span><ChevronDown aria-hidden className="size-4 group-open:rotate-180" /></summary><CrownRace points={data.points} holdsCrown={holdsCrown} holderName={holderName} /></details>
  </>;
}

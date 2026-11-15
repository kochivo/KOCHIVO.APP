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

export function RankV6({ data, holdsCrown, retry }: { data: RankData; holdsCrown: boolean; retry: () => void }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const locale = useLocale();
  const leader = data.board.find(row => row.position === 1);
  const gapWorkouts = Math.max(data.points.crown_needs_workouts, Math.ceil(data.points.crown_gap * data.points.planned / 100));
  return <>
    <RankHero lifetime={data.points.lifetime} holdsCrown={holdsCrown} weekly={data.weekly} />
    <section className="glass overflow-hidden rounded-card border border-warn/30">
      <header className="flex flex-wrap items-center justify-between gap-inline px-page-x pt-card pb-inline">
        <h2 className="font-display text-title font-semibold">{t('race')}</h2>
        {data.points.crown_prize && <p className="text-micro text-faint">{v6t('prize', { prize: data.points.crown_prize })}</p>}
      </header><TeamBoard rows={data.board} />
      <p className="px-page-x pb-card text-xs text-muted">{holdsCrown ? t('holder') : leader && data.points.adherence + data.points.crown_gap <= 100
        ? t('crownWorkouts', { n: formatNumber(gapWorkouts, locale), name: leader.display_name.trim().split(/\s+/)[0] ?? '' })
        : t('gap', { n: formatNumber(data.points.crown_gap, locale) })}</p>
    </section>
    <RankJourney lifetime={data.points.lifetime} />
    {data.medals && <MedalSets counts={data.medals} />}
    <EarnPoints logs={data.points.logs} />
    <details className="group glass rounded-card border border-line-soft px-page-x py-inline"><summary className={`${clickableClass} flex min-h-16 items-center gap-stack rounded-control`}>
      <Award aria-hidden className="size-5 text-muted" /><span className="flex-1">{t('hallTitle')}</span><ChevronDown aria-hidden className="size-4 text-faint group-open:rotate-180" />
    </summary><div className="pb-card"><HallOfFame locale={locale} rows={data.hall} error={data.hallError} onRetry={retry} /></div></details>
    <details className="group glass rounded-card border border-line-soft p-card"><summary className={`${clickableClass} flex min-h-12 items-center gap-inline rounded-control`}><span className="flex-1">{t('log')}</span><ChevronDown aria-hidden className="size-4 group-open:rotate-180" /></summary><PointsLog logs={data.points.logs} /></details>
    <details className="group glass rounded-card border border-line-soft p-card"><summary className={`${clickableClass} flex min-h-12 items-center gap-inline rounded-control`}><span className="flex-1">{v6t('details')}</span><ChevronDown aria-hidden className="size-4 group-open:rotate-180" /></summary><CrownRace points={data.points} holdsCrown={holdsCrown} /></details>
  </>;
}

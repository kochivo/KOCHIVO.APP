'use client';

import { Award, ChevronLeft } from 'lucide-react';
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

export function RankV6({ data, holdsCrown, retry }: { data: RankData; holdsCrown: boolean; retry: () => void }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const locale = useLocale();
  return <>
    <RankHero lifetime={data.points.lifetime} holdsCrown={holdsCrown} />
    <section className="glass overflow-hidden rounded-card border border-line-soft">
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-[18px] pb-1">
        <h2 className="font-display text-[19px] font-semibold">{t('race')}</h2>
        {data.points.crown_prize && <p className="text-[11.5px] text-faint">{v6t('prize', { prize: data.points.crown_prize })}</p>}
      </header><TeamBoard rows={data.board} />
    </section>
    <details className="glass rounded-card border border-line-soft px-5 py-1"><summary className="flex min-h-16 cursor-pointer items-center gap-3">
      <Award aria-hidden className="size-5 text-muted" /><span className="flex-1">{t('hallTitle')}</span><ChevronLeft aria-hidden className="size-4 text-faint dir-icon" />
    </summary><div className="pb-4"><HallOfFame locale={locale} rows={data.hall} error={data.hallError} onRetry={retry} /></div></details>
    <details className="glass rounded-card border border-line-soft p-5"><summary className="min-h-12 cursor-pointer">{v6t('details')}</summary><CrownRace points={data.points} holdsCrown={holdsCrown} /></details>
    <details className="glass rounded-card border border-line-soft p-5"><summary className="min-h-12 cursor-pointer">{t('journey')}</summary><RankJourney lifetime={data.points.lifetime} /></details>
    <details className="glass rounded-card border border-line-soft p-5"><summary className="min-h-12 cursor-pointer">{t('log')}</summary><PointsLog logs={data.points.logs} /></details>
  </>;
}

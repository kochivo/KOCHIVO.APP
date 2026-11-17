import type { ReactNode } from 'react';
import Link from 'next/link';
import { MEDAL_RANKS, medalRank, ranksMessages } from '@/features/ranks';
import { Medal } from '@/ui/medal';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

export function Podium({ rows, locale, allTime = false, children }: { rows: LeaderboardRow[]; locale: Locale; allTime?: boolean; children?: ReactNode }) {
  const t = createT(messages, locale);
  const eligible = rows.filter(row => (allTime ? row.lifetime : row.monthly) > 0);
  const places = [1, 0, 2].flatMap(index => eligible[index] ? [{ row: eligible[index], place: index + 1 }] : []);
  if (!places.length) return null;
  return <section className="glass rounded-card p-card" aria-label={t('workspaceTitle')}>
    <ol className="flex items-end justify-center gap-inline">
      {places.map(({ row, place }) => <li key={row.player_id ?? place}
        className="flex min-w-0 flex-1 flex-col items-center gap-inline text-center">
        <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-full border-2 bg-surface text-md font-bold ${place === 1 ? 'border-gold-2' : 'border-line'}`}>
          {row.display_name.trim().slice(0, 1)}
        </span>
        {row.player_id ? <Link href={`/captain/players/${row.player_id}`} className="press min-h-12 max-w-full content-center truncate text-row font-bold">{row.display_name}</Link> : <b className="max-w-full truncate text-row">{row.display_name}</b>}
        <span className="font-display text-row font-extrabold tabular-nums">{formatNumber(allTime ? row.lifetime : row.monthly, locale)}</span>
        {!allTime && <span className="text-micro text-muted">{t("workoutCount", { n: row.done, count: formatNumber(row.done, locale) })}</span>}
        <Medal rank={MEDAL_RANKS.findIndex(entry => entry.rank === medalRank(row.lifetime)) as 0 | 1 | 2 | 3 | 4 | 5 | 6} size={24} label={createT(ranksMessages, locale)(medalRank(row.lifetime))} />
        <span className={`cut-corner grid w-full place-items-center font-display text-stat-large font-extrabold tabular-nums ${place === 1
          ? 'glass-featured h-40' : place === 2 ? 'glass-strong h-32 text-muted' : 'glass h-24 text-warn'}`}><span className={place === 1 ? "engraved" : undefined}>{formatNumber(place, locale)}</span></span>
      </li>)}
    </ol>
    {children}
  </section>;
}

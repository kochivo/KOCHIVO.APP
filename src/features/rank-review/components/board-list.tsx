import Link from 'next/link';
import { Users } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { EmptyState } from '@/ui';
import { Medal } from '@/ui/medal';
import { MEDAL_RANKS, medalRank, ranksMessages } from '@/features/ranks';
import { messages } from '../messages';

export function BoardList({ rows, locale }: { rows: LeaderboardRow[]; locale: Locale }) {
  const t = createT(messages, locale);
  if (!rows.length) return <EmptyState icon={Users} title={t('empty')} body={t('emptyBody')} />;
  return <ol className="space-y-stack" aria-label={t('title')}>
    {rows.map(row => <li key={row.player_id ?? row.position} className="glass rounded-card">
      <Link href={`/captain/players/${row.player_id}`} className="flex min-h-12 items-center gap-stack p-card">
        <span className="font-bold">{formatNumber(row.position, locale)}</span>
        <Medal rank={MEDAL_RANKS.findIndex(entry => entry.rank === medalRank(row.lifetime)) as 0 | 1 | 2 | 3 | 4 | 5 | 6} size={36} label={createT(ranksMessages, locale)(medalRank(row.lifetime))} />
        <div className="min-w-0 flex-1"><p className="break-words font-bold">{row.display_name}</p>
          <p className="text-sm text-muted">{t('lifetime', { count: formatNumber(row.lifetime, locale) })}</p></div>
        <div className="shrink-0 text-end text-sm tabular-nums">
          <p className="font-bold">{t('percent', { n: formatNumber(row.adherence, locale) })}</p>
          <p className="text-muted">{t('workouts', {
            done: formatNumber(row.done, locale), planned: formatNumber(row.planned, locale),
          })}</p>
        </div>
      </Link>
    </li>)}
  </ol>;
}

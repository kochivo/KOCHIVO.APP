import Link from 'next/link';
import { Users } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { EmptyState, RankBadge } from '@/ui';
import { messages } from '../messages';

export function BoardList({ rows, locale }: { rows: LeaderboardRow[]; locale: Locale }) {
  const t = createT(messages, locale);
  if (!rows.length) return <EmptyState icon={Users} title={t('empty')} body={t('emptyBody')} />;
  return <ol className="space-y-3" aria-label={t('title')}>
    {rows.map(row => <li key={row.player_id ?? row.position} className="glass rounded-card">
      <Link href={`/captain/players/${row.player_id}`} className="flex min-h-12 items-center gap-3 p-4">
        <span className="font-bold">{formatNumber(row.position, locale)}</span>
        <RankBadge tier={row.tier} size="sm" label={t(row.tier)} />
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

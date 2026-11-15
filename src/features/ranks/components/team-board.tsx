'use client';

import { Users } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { EmptyState, RankBadge } from '@/ui';
import type { LeaderboardRow } from '../types';
import { messages } from '../messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';

export function TeamBoard({ rows }: { rows: LeaderboardRow[] }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled();
  const locale = useLocale();
  if (!rows.some(row => row.done > 0)) return <EmptyState icon={Users} title={t('board')} body={t('emptyBoard')} />;
  return <section className={v6 ? '' : 'glass space-y-stack rounded-card p-card'}>
    {!v6 && <h2 className="font-bold">{t('board')}</h2>}
    <ol className={v6 ? 'divide-y divide-line-soft' : 'space-y-inline'}>{rows.map(row => <li key={row.position} aria-current={row.player_id !== null ? 'true' : undefined}
      className={v6 ? `flex min-h-16 items-center gap-stack px-page-x py-stack ${row.player_id !== null ? 'bg-surface-raised' : ''}` : `flex items-center gap-stack rounded-control p-stack ${row.player_id !== null ? 'bg-lime-soft' : ''}`}>
      <span className="tabular-nums">{formatNumber(row.position, locale)}</span>
      <RankBadge tier={row.is_crown ? 'crown' : row.tier} size="sm" label={t(row.is_crown ? 'crown' : row.tier)} />
      {v6 ? <div className="min-w-0 flex-1"><p className="truncate">{row.player_id !== null ? v6t('you') : row.display_name.trim().split(/\s+/)[0]}</p>
        <p className="mt-inline text-micro text-faint">{v6t(row.player_id !== null ? 'adherence' : 'others', { n: formatNumber(row.adherence, locale) })}</p></div>
        : <><span className="min-w-0 flex-1 truncate">{row.display_name.trim().split(/\s+/)[0]}</span>
          <span className="shrink-0 text-sm">{t('percent', { n: formatNumber(row.adherence, locale) })}</span></>}
    </li>)}</ol>
  </section>;
}

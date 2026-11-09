'use client';

import { Users } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { EmptyState, RankBadge } from '@/ui';
import type { LeaderboardRow } from '../types';
import { messages } from '../messages';

export function TeamBoard({ rows }: { rows: LeaderboardRow[] }) {
  const t = useT(messages);
  const locale = useLocale();
  if (!rows.length || rows.every(row => row.monthly === 0)) return <EmptyState icon={Users} title={t('board')} body={t('emptyBoard')} />;
  return <section className="glass space-y-3 rounded-card p-4">
    <h2 className="font-bold">{t('board')}</h2>
    <ol className="space-y-2">{rows.map(row => <li key={row.position} aria-current={row.player_id !== null ? 'true' : undefined}
      className={`flex items-center gap-3 rounded-control p-3 ${row.player_id !== null ? 'bg-lime-soft' : ''}`}>
      <span className="tabular-nums">{formatNumber(row.position, locale)}</span>
      <RankBadge tier={row.is_crown ? 'crown' : row.tier} size="sm" label={t(row.is_crown ? 'crown' : row.tier)} />
      <span className="min-w-0 flex-1 truncate">{row.display_name.trim().split(/\s+/)[0]}</span>
      <span className="text-sm">{t('points', { n: formatNumber(row.monthly, locale) })}</span>
    </li>)}</ol>
  </section>;
}

'use client';

import { Award } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { EmptyState } from '@/ui';
import type { MyPoints } from '../data/load-my-points';
import { messages } from '../messages';

export function PointsLog({ logs }: { logs: MyPoints['logs'] }) {
  const t = useT(messages);
  const locale = useLocale();
  if (!logs.length) return <EmptyState icon={Award} title={t('log')} body={t('emptyLog')} />;
  return <section className="glass space-y-3 rounded-card p-4">
    <h2 className="font-bold">{t('log')}</h2>
    <ul className="divide-y divide-line">{logs.slice(0, 10).map(row => <li key={row.id} className="flex items-center justify-between gap-3 py-3">
      <div className="space-y-1"><p>{t(row.kind)}</p>
        <time dateTime={row.earned_on} className="text-xs text-muted">{formatDateAr(row.earned_on, { day: 'numeric', month: 'short', year: 'numeric' }, locale)}</time>
        {row.status !== 'counted' && <p className="text-sm text-muted">{t(row.status)}</p>}
      </div>
      <span className={row.status === 'counted' ? 'text-sm font-bold' : 'text-sm font-bold line-through text-muted'}>{t('points', { n: formatNumber(row.points, locale) })}</span>
    </li>)}</ul>
  </section>;
}

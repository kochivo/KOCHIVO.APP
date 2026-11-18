'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { StatStrip } from '@/ui/stat-strip';
import type { MyPoints } from '../data/points-schema';
import { messages } from '../player-v4/messages';

export function RankPointSources({ logs }: { logs: MyPoints['logs'] }) {
  const t = useT(messages), locale = useLocale();
  const totals = { training: 0, meals: 0, checks: 0 };
  for (const log of logs) {
    if (log.status !== 'counted') continue;
    const category = log.kind === 'meal_check' ? 'meals' : log.kind === 'inbody' ? 'checks' : 'training';
    totals[category] += log.points;
  }
  if (!Object.values(totals).some(Boolean)) return null;
  return <section className="space-y-stack">
    <h2 className="text-row font-bold">{t('sources')}</h2>
    <StatStrip className="grid-cols-3! [&>div]:px-stack" items={(['training', 'meals', 'checks'] as const).map(key => ({
      label: t(key), value: totals[key] ? `+${formatNumber(totals[key], locale)}` : formatNumber(0, locale),
    }))} />
  </section>;
}

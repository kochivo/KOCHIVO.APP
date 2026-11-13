import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';

export async function StatsStrip() {
  const { stats } = getContent(await getT(messages));
  return <dl className="glass-strong grid gap-6 rounded-card p-7 text-center sm:grid-cols-3">
    {stats.map(stat => <div key={stat.l} className="flex flex-col gap-2"><dt className="order-2 text-sm text-muted">{stat.l}</dt><dd className="font-display text-3xl font-extrabold" data-count={stat.count || undefined}>{stat.v}</dd></div>)}
  </dl>;
}

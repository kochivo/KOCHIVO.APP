import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';

export async function StatsStrip() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section className="marketing-wrap marketing-reveal pt-16"><dl className="glass-strong flex flex-wrap justify-around gap-6 rounded-card px-7 py-[22px] text-center">
    {content.stats.map(stat => <div key={stat.l} className="flex flex-col gap-1"><dt className="order-2 text-[13px] text-muted">{stat.l}</dt><dd className="font-display text-[32px] font-extrabold text-ink">{stat.v}</dd></div>)}
  </dl></section>;
}

import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import type { Metrics } from '../types';
import Link from 'next/link';

export function FormCard({ title, count, metrics, selected = false, locale, href }: {
  title: string; count: number; metrics?: Metrics; selected?: boolean; locale: Locale; href: string;
}) {
  const m = messages[locale], rate = metrics?.sent ? metrics.answered / metrics.sent : null;
  return <Link href={href} prefetch={false} aria-current={selected ? 'page' : undefined}
    className={`glass block min-h-12 w-full rounded-card border p-card text-start ${selected ? 'border-lime' : 'border-line'}`}>
    <span className="block font-bold">{title}</span>
    <span className="mt-stack flex flex-wrap gap-card-gap text-sm text-muted">
      <span>{count} {m.questions}</span><span>{metrics?.recipients ?? 0} {m.recipients}</span>
      <span className={rate !== null && rate < .75 ? 'text-warn' : 'text-lime'}>
        {rate === null ? m.unanswered : `${Math.round(rate * 100)}% ${m.rate}`}
      </span>
    </span>
  </Link>;
}

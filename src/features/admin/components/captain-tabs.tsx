'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { clickableClass } from '@/ui/button';
import { messages } from '../dashboard/messages';
import { captainFilters } from '../dashboard-ui';
import type { CaptainFilter } from '../dashboard-ui';
import type { AdminDashboard } from '../dashboard-types';

export function CaptainTabs({ filter, counts, onChange }: {
  filter: CaptainFilter; counts?: AdminDashboard['stateCounts']; onChange: (value: CaptainFilter) => void;
}) {
  const t = useT(messages); const locale = useLocale();
  const tabs: CaptainFilter[] = [...captainFilters];
  if (filter === 'quiet' || filter === 'overLimit') tabs.push(filter);
  return <div aria-label={t('filters')} className="flex flex-wrap gap-inline">
    {tabs.map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => onChange(key)}
      className={`min-h-12 rounded-full border px-stack text-row ${clickableClass} ${filter === key ? 'border-lime/40 bg-lime-soft text-lime' : 'border-line bg-surface text-muted'}`}>
      {t(key === 'paid' ? 'paid' : key)}
      {counts && key !== 'overLimit' && key !== 'quiet' && <span className="num ms-inline rounded-full bg-ink/5 px-inline font-bold text-ink">{formatNumber(counts[key], locale)}</span>}
    </button>)}
  </div>;
}

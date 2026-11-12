'use client';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { workspaceMessages } from '../workspace-messages';
export function WorkspaceEmpty({ count, hours }: { count: number; hours: number | null }) {
  const t = useT(workspaceMessages), locale = useLocale();
  return <div role="status" className="glass rounded-card border border-line-soft px-5 py-10 text-center">
    <Check className="mx-auto size-8 text-lime" strokeWidth={1.5} aria-hidden />
    <h2 className="mb-1.5 mt-2.5 font-display text-[19px] font-semibold">{t('caughtUp')}</h2>
    <p className="text-muted">{t('weekSummary', { n: formatNumber(count, locale) })}{hours !== null && t('weekAverage', { h: formatNumber(Math.round(hours * 10) / 10, locale) })}</p>
  </div>;
}

'use client';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { workspaceMessages } from '../workspace-messages';
export function WorkspaceEmpty({ count, hours }: { count: number; hours: number | null }) {
  const t = useT(workspaceMessages), locale = useLocale();
  return <div role="status" className="glass rounded-card border border-line-soft px-page-x py-section text-center">
    <Check className="mx-auto size-8 text-lime" strokeWidth={1.5} aria-hidden />
    <h2 className="mb-inline mt-stack font-display text-title font-semibold">{t('caughtUp')}</h2>
    <p className="text-muted">{t('weekSummary', { n: formatNumber(count, locale) })}{hours !== null && t('weekAverage', { n: Math.round(hours * 10) / 10, h: formatNumber(Math.round(hours * 10) / 10, locale) })}</p>
  </div>;
}

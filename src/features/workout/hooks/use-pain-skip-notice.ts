'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { useToast } from '@/ui/toast';
import type { PainReportRow } from '@/core/offline/pain-tables';
import { messages } from '../pain/messages';

export function usePainSkipNotice() {
  const t = useT(messages);
  const locale = useLocale();
  const toast = useToast();
  return (count: number, report: PainReportRow) => {
    if (count > 0) toast.success({ title: t('removed', { n: formatNumber(count, locale), area: t(report.area) }), icon: 'check' });
  };
}

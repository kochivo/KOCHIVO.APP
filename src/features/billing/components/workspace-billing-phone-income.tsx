import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ProgressBar } from '@/ui/progress-bar';
import { messages } from '../phone/messages';
import { messages as financeMessages } from '../workspace/messages';

export function WorkspaceBillingPhoneIncome({ income, expected, waiting }: {
  income: number; expected: number; waiting: number;
}) {
  const locale = useLocale(), t = useT(messages), finance = useT(financeMessages);
  const forecast = t('forecast', { expected: formatNumber(expected, locale), waiting: formatNumber(waiting, locale) });
  return <section className="glass-strong cut-corner rounded-card border border-lime/25 bg-lime-soft p-card md:hidden">
    <h2 className="text-xs text-muted">{t('income')}</h2>
    <p className="mt-inline flex flex-wrap items-end gap-inline">
      <bdi className="engraved break-all text-stat-large-wide">{formatNumber(income, locale)}</bdi>
      <span className="text-sm text-muted">{finance('currency')}</span>
    </p>
    <ProgressBar thin className="mt-stack" value={income} max={expected || 1} aria-label={forecast} />
    <p className="mt-inline text-micro text-muted">{forecast}</p>
  </section>;
}

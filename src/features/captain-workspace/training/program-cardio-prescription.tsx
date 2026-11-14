import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import type { ProgramSummaryCardio } from './player-program-model';
import { messages } from './player-program-messages';

export function ProgramCardioPrescription({ row, locale }: { row: ProgramSummaryCardio; locale: Locale }) {
  const t = createT(messages, locale);
  return <li className="space-y-1 border-t border-line-soft py-3">
    <h3 className="break-words text-sm font-semibold">{row.kind}</h3>
    <p className="text-xs text-muted">{t('minutes', { count: formatNumber(row.minutes, locale) })} · {t(row.intensity)}</p>
    {row.notes && <p className="whitespace-pre-wrap break-words text-xs text-muted">{row.notes}</p>}
  </li>;
}

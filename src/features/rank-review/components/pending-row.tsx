import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui';
import { messages } from '../messages';
import type { PendingWorkout } from '../types';

export function PendingRow({ row, locale, onDecision, disabled = false }: {
  row: PendingWorkout; locale: Locale; onDecision: (id: string, approve: boolean) => void; disabled?: boolean;
}) {
  const t = createT(messages, locale);
  const minutes = row.completed_at === null || row.started_at === null ? null : Math.max(0,
    Math.round((Date.parse(row.completed_at) - Date.parse(row.started_at)) / 60_000));
  return <li className="glass space-y-3 rounded-card p-4">
    <p className="break-words font-bold">{row.player_name ?? t('player')}</p>
    <div className="flex flex-wrap gap-3 text-sm text-muted">
      {row.training_date !== null && <time dateTime={row.training_date}>{formatDateAr(row.training_date, { day: 'numeric', month: 'short', year: 'numeric' }, locale)}</time>}
      <span>{minutes === null ? t('unknownDuration') : t('duration', { count: formatNumber(minutes, locale) })}</span>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button className="min-h-12" disabled={disabled} onClick={() => onDecision(row.id, true)}>{t('approve')}</Button>
      <Button variant="secondary" className="min-h-12" disabled={disabled} onClick={() => {
        if (window.confirm(t('confirm'))) onDecision(row.id, false);
      }}>{t('reject')}</Button>
    </div>
  </li>;
}

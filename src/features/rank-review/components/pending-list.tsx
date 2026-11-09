import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import type { PendingWorkout } from '../types';
import { PendingRow } from './pending-row';

export function PendingList({ rows, locale, onDecision, disabled = false }: {
  rows: PendingWorkout[]; locale: Locale; onDecision: (id: string, approve: boolean) => void; disabled?: boolean;
}) {
  if (!rows.length) return null;
  const t = createT(messages, locale);
  return <section className="space-y-3" aria-label={t('pending')}>
    <h2 className="text-lg font-bold">{t('pending')}</h2>
    <ul className="space-y-3">{rows.map(row => <PendingRow key={row.id} row={row} locale={locale}
      onDecision={onDecision} disabled={disabled} />)}</ul>
  </section>;
}

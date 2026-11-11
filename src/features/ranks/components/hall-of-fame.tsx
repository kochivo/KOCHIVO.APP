import { Crown } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { EmptyState, ErrorState, LoadingState, RankBadge } from '@/ui';
import type { HallOfFameRow } from '../data/load-hall-of-fame';
import { messages } from '../messages';

export function HallOfFame({ locale, rows, error = false, onRetry }: {
  locale: Locale; rows?: HallOfFameRow[]; error?: boolean; onRetry: () => void;
}) {
  const t = createT(messages, locale);
  return <section className="space-y-3" aria-label={t('hallTitle')}>
    <h2 className="font-bold">{t('hallTitle')}</h2>
    {error ? <ErrorState message={t('hallError')} retryLabel={t('retry')} onRetry={onRetry} />
      : !rows ? <LoadingState variant="cards" />
        : !rows.length ? <EmptyState icon={Crown} title={t('hallEmpty')} body={t('hallDescription')} />
          : <ol className="space-y-3">{rows.map(row => <li key={row.month} className="flex items-center gap-3">
            <RankBadge tier="crown" size="sm" label={t('crown')} />
            <div className="min-w-0 flex-1">
              <time dateTime={row.month} className="text-sm text-muted">{new Intl.DateTimeFormat(
                locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en', { month: 'long', year: 'numeric', timeZone: 'UTC' },
              ).format(new Date(`${row.month}T12:00:00Z`))}</time>
              <p className="break-words font-semibold">{row.display_name}</p>
            </div>
            <span className="shrink-0 text-sm">{t('hallAdherence', { n: formatNumber(row.adherence, locale) })}</span>
          </li>)}</ol>}
  </section>;
}

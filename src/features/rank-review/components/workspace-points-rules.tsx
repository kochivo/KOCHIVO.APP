import { useArabicStyle } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { workspaceMessages } from './workspace/messages';

// Match the workout, perfect week and record awards in 0081_points_and_ranks.sql.
const rules = [['workout', 3], ['week', 10], ['record', 1]] as const;

export function WorkspacePointsRules({ locale }: { locale: Locale }) {
  const t = createT(workspaceMessages, locale, useArabicStyle());
  return <section className="glass rounded-card p-card">
    <h2 className="pb-inline text-sm font-bold">{t('scoring')}</h2>
    <dl>
      {rules.map(([key, points]) => <div key={key} className="flex min-h-10 items-center justify-between gap-inline border-t border-line-soft text-row">
        <dt className="text-muted">{t(key)}</dt>
        <dd className="font-display font-extrabold text-lime tabular-nums">
          <bdi dir="ltr">{t('signedPoints', { points: formatNumber(points, locale) })}</bdi>
        </dd>
      </div>)}
    </dl>
  </section>;
}

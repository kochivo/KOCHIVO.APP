import Link from 'next/link';
import type { Locale } from '@/core/i18n/locale';
import { intlLocale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { factLabel, factValue } from '../components/player-file-format';
import type { PlayerForm } from './adapter';
import { messages } from './messages';
import { buttonClass } from '@/ui/button';

const colors = { better: 'text-lime', worse: 'text-warn', same: 'text-muted', new: 'text-muted' } as const;

export function FormAnswers({ form, locale, trainingHref }: { form: PlayerForm; locale: Locale; trainingHref: string }) {
  const t = createT(messages, locale);
  return <dl className="divide-y divide-line">
    {!form.comparison.length && <div className="py-page-y text-muted"><dd>{t('noAnswers')}</dd></div>}
    {form.comparison.map(row => {
      const injury = row.key === 'injuries' && Array.isArray(row.value) && row.value.some(value => value !== 'none');
      const change = row.delta === undefined ? t(row.direction === 'new' ? 'new' : row.direction === 'worse' ? 'worse' : 'same')
        : new Intl.NumberFormat(intlLocale(locale), { signDisplay: 'always', maximumFractionDigits: 2 }).format(row.delta);
      return <div key={row.key} className={`grid gap-inline py-page-y sm:grid-cols-[1fr_2fr_auto] ${injury ? 'rounded-control bg-danger-soft px-stack text-danger' : ''}`}>
        <dt className="text-sm text-muted">{factLabel(row.key, locale)}</dt>
        <dd className="min-w-0 whitespace-pre-wrap break-words">
          <span className="font-bold">{factValue(row.key, row.value, locale)}</span>
          {row.previousValue !== undefined && <p className="mt-inline text-sm text-muted">{t('previous', { value: factValue(row.key, row.previousValue, locale) })}</p>}
        </dd>
        <dd className={`text-sm ${colors[row.direction]}`}><bdi dir={row.delta === undefined ? undefined : 'ltr'}>{change}</bdi>
          {injury && <Link href={trainingHref} className={buttonClass({ variant: 'secondary', block: false, className: "mt-inline flex min-h-12 items-center px-stack text-ink" })}>{t('training')}</Link>}
        </dd>
      </div>;
    })}
    {form.bodyFat !== null && <div className="grid gap-inline py-page-y sm:grid-cols-[1fr_2fr_auto]">
      <dt className="text-sm text-muted">{t('bodyFat')}</dt><dd>{t('percent', { value: formatNumber(form.bodyFat, locale) })}
        {form.previousBodyFat != null && <p className="text-sm text-muted">{t('previous', { value: t('percent', { value: formatNumber(form.previousBodyFat, locale) }) })}</p>}
      </dd><dd className="text-sm text-muted">{form.previousBodyFat == null ? t('new') :
        <bdi dir="ltr">{new Intl.NumberFormat(intlLocale(locale), { signDisplay: 'always', maximumFractionDigits: 2 }).format(form.bodyFat - form.previousBodyFat)}</bdi>}</dd>
    </div>}
  </dl>;
}

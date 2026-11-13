import type { Translator } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import type { PublicPage } from '../public-sections';
import type { messages } from '../sections/messages';

export function PublicFacts({ years, languages, t }: { years: number | null; languages: PublicPage['languages']; t: Translator<typeof messages> }) {
  if (years === null && !languages.length) return null;
  return <dl className="glass divide-y divide-line-soft rounded-card px-6">
    {years !== null && <div className="flex justify-between gap-6 py-4"><dt className="text-muted">{t('years')}</dt><dd dir="ltr">{formatNumber(years)}</dd></div>}
    {languages.length > 0 && <div className="flex justify-between gap-6 py-4"><dt className="text-muted">{t('languages')}</dt><dd className="flex gap-3">{languages.map(lang => <span key={lang}>{t(lang)}</span>)}</dd></div>}
  </dl>;
}

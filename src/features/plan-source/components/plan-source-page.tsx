import 'server-only';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { localeDir } from '@/core/i18n/locale';
import type { Locale } from '@/core/i18n/locale';
import { buttonClass } from '@/ui/button';
import { loadPlanSource } from '../data/load-source';
import { messages } from '../messages';
import { SheetContent } from './sheet-content';

export async function PlanSourcePage({ id, locale, tab, query }: { id: string; locale: Locale; tab?: string; query?: string }) {
  const result = await loadPlanSource(id);
  if (result.status === 'missing') notFound();
  const t = await getT(messages, locale);
  if (result.status === 'error') return <main dir={localeDir(locale)} className="space-y-card-gap px-page-x py-page-y">
    <p role="alert" className="text-danger">{t('unavailable')}</p>
    <Link prefetch={false} href={`/${locale}/captain/plan-source/${id}`} className={buttonClass({ variant: 'secondary', block: false })}>{t('retry')}</Link>
  </main>;
  return <main dir={localeDir(locale)} className="mx-auto min-w-0 max-w-6xl space-y-section px-page-x py-page-y">
    <Link className={buttonClass({ variant: 'secondary', block: false })}
      href={`/${locale}/captain/${result.kind === 'training' ? 'programs' : 'nutrition'}/${id}`}>{t('back')}</Link>
    <header className="space-y-inline">
      <h1 className="text-h font-bold">{t('title')}</h1>
      <p className="break-words font-semibold"><bdi>{result.source.fileName}</bdi></p>
      <p className="text-sm text-muted">{t('snapshot')}</p>
    </header>
    <SheetContent source={result.source} locale={locale}
      selected={tab && /^\d{1,2}$/.test(tab) && Number(tab) < result.source.sheets.length ? Number(tab) : 0}
      search={query?.slice(0, 120) ?? ''} />
  </main>;
}

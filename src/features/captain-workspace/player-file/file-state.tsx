import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { buttonClass } from '@/ui/button';

export function FileState({ locale, error, href }: { locale: Locale; error?: boolean; href?: string }) {
  const t = createT(messages, locale);
  return <div role={error ? 'alert' : 'status'} className="glass space-y-stack rounded-card border border-line-soft p-card">
    <p className={error ? 'text-danger' : 'text-faint'}>{t(error ? 'error' : 'loading')}</p>
    {error && href && <a href={href} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x" })}>{t('retry')}</a>}
    {!error && <div aria-hidden className="space-y-stack">{[0, 1, 2].map(key => <div key={key} className="h-[72px] animate-pulse rounded-control bg-ink/5" />)}</div>}
  </div>;
}

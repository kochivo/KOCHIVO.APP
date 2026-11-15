import Link from 'next/link';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import { buttonClass } from '@/ui/button';

export function WorkspaceState({ kind, locale, retryHref }: {
  kind: 'loading' | 'error' | 'empty'; locale: Locale; retryHref?: string;
}) {
  const t = createT(messages, locale);
  if (kind === 'loading') return <p role="status" className="glass-strong min-h-24 rounded-card p-section text-muted">{t('loading')}</p>;
  if (kind === 'error') return <div role="alert" className="glass space-y-stack rounded-card p-section">
    <p className="text-danger">{t('error')}</p>
    {retryHref && <a href={retryHref} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x text-ink" })}>{t('retry')}</a>}
  </div>;
  return <section className="glass space-y-stack rounded-card p-section">
    <h2 className="text-xl font-bold">{t('noProgram')}</h2>
    <p className="text-muted">{t('createInvitation')}</p>
    <Link href="/captain/templates" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x font-bold" })}>{t('create')}</Link>
  </section>;
}

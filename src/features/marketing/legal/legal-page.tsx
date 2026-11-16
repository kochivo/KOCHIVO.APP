import 'server-only';
import { getT } from '@/core/i18n/server';
import { buttonClass } from '@/ui/button';
import { whatsappUrl } from '../content';
import { messages } from './messages';
import type { Locale } from '@/core/i18n/locale';

const sections = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export async function LegalPage({ kind, locale }: { kind: 'privacy' | 'terms'; locale: Locale }) {
  const t = await getT(messages, locale);
  return <div className="min-h-dvh bg-bg text-ink">
    <header className="mx-auto flex max-w-prose flex-wrap items-center justify-between gap-inline px-page-x py-page-y">
      {/* Plain images keep the legal pages free of image client JavaScript. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-primary.png" alt={t('brand')} width={98} height={28} className="theme-dark-only" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-primary-light.png" alt={t('brand')} width={98} height={28} className="theme-light-only" />
      <a href={`/${locale}`} className={buttonClass({ variant: 'ghost', block: false })}>{t('home')}</a>
    </header>
    <main className="mx-auto flex max-w-prose flex-col gap-section px-page-x py-page-y text-start">
      <div className="flex flex-col gap-stack">
        <h1 className="text-h font-semibold">{t(`${kind}Title`)}</h1>
        <p className="text-sm text-muted">{t('updated')}</p>
      </div>
      {sections.map(section => <section key={section} aria-labelledby={`${kind}-${section}`} className="flex flex-col gap-stack">
        <h2 id={`${kind}-${section}`} className="text-title font-semibold">{t(`${kind}${section}Title`)}</h2>
        {kind === 'privacy' && section === 2
          ? <ul className="flex list-disc flex-col gap-stack ps-card text-md leading-relaxed text-muted">
            {t('privacy2Body').split('|').map(item => <li key={item}>{item}</li>)}
          </ul>
          : <p className="text-md leading-relaxed text-muted">{t(`${kind}${section}Body`)}</p>}
      </section>)}
      <a href={whatsappUrl} className={buttonClass({ variant: 'secondary', block: false })}>{t('support')}</a>
    </main>
  </div>;
}

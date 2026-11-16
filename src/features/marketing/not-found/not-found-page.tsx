import 'server-only';
import { getT } from '@/core/i18n/server';
import { buttonClass } from '@/ui/button';
import { messages } from './messages';

// Plain img tags: this boundary sits under every locale route, so it must not add client JS.
export async function NotFoundPage() {
  const t = await getT(messages);
  return <main className="grid min-h-dvh place-items-center bg-bg px-page-x py-page-y text-ink">
    <div className="glass flex max-w-lg flex-col items-center gap-section rounded-card p-card text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-primary.png" alt={t('brand')} width={1374} height={387} className="h-14 w-auto [[data-theme=light]_&]:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-primary-light.png" alt={t('brand')} width={1374} height={387} className="hidden h-14 w-auto [[data-theme=light]_&]:block" />
      <h1 className="text-h font-semibold">{t('title')}</h1>
      {/* A full load is fine from a 404, and Link would add client JS to every locale route. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className={buttonClass({ block: false })}>{t('home')}</a>
    </div>
  </main>;
}

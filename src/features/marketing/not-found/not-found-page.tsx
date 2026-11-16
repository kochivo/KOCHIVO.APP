import Image from 'next/image';
import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import { buttonClass } from '@/ui/button';
import { messages } from './messages';

export async function NotFoundPage() {
  const t = await getT(messages);
  return <main className="grid min-h-dvh place-items-center bg-bg px-page-x py-page-y text-ink">
    <div className="glass flex max-w-lg flex-col items-center gap-section rounded-card p-card text-center">
      <Image src="/brand/logo-primary.png" alt={t('brand')} width={196} height={56} className="theme-dark-only h-14 w-auto" />
      <Image src="/brand/logo-primary-light.png" alt={t('brand')} width={196} height={56} className="theme-light-only h-14 w-auto" />
      <h1 className="text-h font-semibold">{t('title')}</h1>
      <Link href="/" className={buttonClass({ block: false })}>{t('home')}</Link>
    </div>
  </main>;
}

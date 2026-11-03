import type { Metadata } from 'next';
import type { Locale } from '@/core/i18n/locale';
import { createT, defineMessages } from '@/core/i18n/messages';

// Lives in the app layer: importing a feature barrel from the root layout ships its client UI on every route.
const messages = defineMessages({
  ar: {
    brand: 'KOCHIVO', title: 'كوتشيفو — كل لاعبينك في مكان واحد', titleTemplate: '%s · كوتشيفو',
    description: 'برنامج وأكل ومتابعة كل لاعب في مكان واحد. واللاعب بيسجّل حتى لو النت فاصل.',
  },
  en: {
    brand: 'KOCHIVO', title: 'KOCHIVO — All your players in one place', titleTemplate: '%s · KOCHIVO',
    description: 'Training, meals and follow-up for every player in one place. Players can log offline.',
  },
});

export function siteMetadata(locale: Locale): Metadata {
  const t = createT(messages, locale);
  const title = t('title'), description = t('description');
  const image = '/opengraph-image';
  return {
    metadataBase: new URL('https://kochivo.site'), title: { default: title, template: t('titleTemplate') }, description,
    applicationName: t('brand'),
    appleWebApp: { capable: true, title: t('brand'), statusBarStyle: 'black-translucent' },
    icons: { icon: '/icons/favicon-32.png', apple: '/icons/icon-192.png' },
    openGraph: { title, description, locale: locale === 'ar' ? 'ar_EG' : 'en_GB',
      type: 'website', siteName: t('brand'), images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

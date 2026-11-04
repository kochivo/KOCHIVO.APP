import type { Metadata } from 'next';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

export function coachMetadata(locale: Locale, slug: string, coach: { full_name: string; bio: string | null }): Metadata {
  const t = createT(messages, locale);
  const title = coach.full_name, description = coach.bio || t('coachDescription', { name: title });
  const image = `/c/${slug}/opengraph-image`;
  return { title, description, alternates: { canonical: `/c/${slug}` },
    openGraph: { title, description, url: `/c/${slug}`, type: 'profile', siteName: t('brand'),
      locale: locale === 'ar' ? 'ar_EG' : 'en_GB', images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] } };
}

import { notFound } from 'next/navigation';
import { parseLocale } from '@/core/i18n/locale';
import { loadPublicCoach } from '@/features/coach-page';
import { shareImage } from '@/features/share-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const coach = await loadPublicCoach(slug);
  if (!coach) notFound();
  return shareImage(parseLocale(locale), coach);
}

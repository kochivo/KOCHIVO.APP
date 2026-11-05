import { parseLocale } from '@/core/i18n/locale';
import { shareImage } from '@/features/share-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  return shareImage(parseLocale((await params).locale));
}

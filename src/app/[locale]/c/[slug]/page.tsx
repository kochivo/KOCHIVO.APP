import { notFound } from 'next/navigation';
import { CoachPage, coachMetadata, loadPublicCoach } from '@/features/coach-page';
import { parseLocale } from '@/core/i18n/locale';
import { setRequestLocale } from '@/core/i18n/server';
import { parseCoachRequestStatus } from '@/lib/coach-request-status';

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ requested?: string | string[] }> };
export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const coach = await loadPublicCoach(slug);
  if (!coach) notFound();
  return coachMetadata(parseLocale(locale), slug, coach);
}
export default async function Page({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(parseLocale(locale));
  return <CoachPage slug={slug} requested={parseCoachRequestStatus((await searchParams).requested)} />;
}

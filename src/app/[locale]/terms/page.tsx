import type { Metadata } from 'next';
import { parseLocale } from '@/core/i18n/locale';
import { setRequestLocale } from '@/core/i18n/server';
import { LegalPage, legalMetadata } from '@/features/marketing/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return legalMetadata('terms', parseLocale((await params).locale));
}

export default async function TermsPage({ params }: Props) {
  const locale = parseLocale((await params).locale);
  setRequestLocale(locale);
  return <LegalPage kind="terms" locale={locale} />;
}

import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { onboardingMessages } from '@/features/onboarding';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { fetchOnboardingStatus, IntakeWizard } from '@/features/onboarding';
import { LoadingState } from '@/ui';

async function IntakeContent({ locale }: { locale: string }) {
  const { submitted, statusError } = await fetchOnboardingStatus(parseLocale(locale));
  if (submitted) redirect('/player');
  return <IntakeWizard statusError={statusError} />;
}

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getT(onboardingMessages, parseLocale(locale));
  return <Suspense fallback={<LoadingState aria-label={t('loadingYourDetails')} />}><IntakeContent locale={locale} /></Suspense>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(onboardingMessages, parseLocale((await params).locale));
  return { title: t('pageTitle') };
}

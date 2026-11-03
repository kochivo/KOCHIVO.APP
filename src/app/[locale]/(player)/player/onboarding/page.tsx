import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { fetchOnboardingStatus, IntakeWizard } from '@/features/onboarding';
import { LoadingState } from '@/ui';

async function IntakeContent() {
  const { submitted, statusError } = await fetchOnboardingStatus();
  if (submitted) redirect('/player');
  return <IntakeWizard statusError={statusError} />;
}

export default function OnboardingPage() {
  return <Suspense fallback={<LoadingState aria-label="بنحمّل بياناتك" />}><IntakeContent /></Suspense>;
}

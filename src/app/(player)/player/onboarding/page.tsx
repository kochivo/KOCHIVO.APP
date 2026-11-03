import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { hasIntake, IntakeWizard } from '@/features/onboarding';
import { LoadingState } from '@/ui';

async function IntakeContent() {
  let submitted: boolean;
  try {
    submitted = await hasIntake();
  } catch {
    return <IntakeWizard statusError="مش قادرين نحمّل بياناتك. جرّب تاني" />;
  }
  if (submitted) redirect('/player');
  return <IntakeWizard />;
}

export default function OnboardingPage() {
  return <Suspense fallback={<LoadingState aria-label="بنحمّل بياناتك" />}><IntakeContent /></Suspense>;
}

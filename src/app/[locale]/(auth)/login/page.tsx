import { authMode, CaptainAuthCard, CoachSignup, consentReturnPath } from '@/features/auth';
import { InstalledLoginRedirect } from '@/features/welcome';
import { coachSlug } from '@/lib/coach-slug';

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; tab?: string; coach?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const coach = coachSlug(params.coach);
  if (coach) return <CoachSignup coach={coach} callbackError={!!params.error} />;
  const returnTo = consentReturnPath(params.returnTo);
  return <>{!returnTo && <InstalledLoginRedirect />}<CaptainAuthCard callbackError={!!params.error}
    initialMode={returnTo ? 'login' : authMode(params.tab)} returnTo={returnTo} /></>;
}

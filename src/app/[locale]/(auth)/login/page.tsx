import { authMode, CaptainAuthCard, CoachSignup, consentReturnPath } from '@/features/auth';
import { InstalledLoginRedirect } from '@/features/welcome';
import { coachSlug } from '@/lib/coach-slug';

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; passwordUpdated?: string; tab?: string; coach?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const coach = coachSlug(params.coach);
  if (coach) return <CoachSignup coach={coach} callbackError={!!params.error} />;
  const returnTo = consentReturnPath(params.returnTo);
  const passwordUpdated = params.passwordUpdated === '1';
  return <>{!returnTo && !passwordUpdated && <InstalledLoginRedirect />}<CaptainAuthCard passwordUpdated={passwordUpdated} callbackError={!!params.error}
    initialMode={returnTo ? 'login' : authMode(params.tab)} returnTo={returnTo} /></>;
}

import { authMode, CaptainAuthCard, CoachSignup } from '@/features/auth';
import { InstalledLoginRedirect } from '@/features/welcome';
import { coachSlug } from '@/lib/coach-slug';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; tab?: string; coach?: string }> }) {
  const params = await searchParams;
  const coach = coachSlug(params.coach);
  if (coach) return <CoachSignup coach={coach} callbackError={!!params.error} />;
  return <><InstalledLoginRedirect /><CaptainAuthCard callbackError={!!params.error} initialMode={authMode(params.tab)} /></>;
}

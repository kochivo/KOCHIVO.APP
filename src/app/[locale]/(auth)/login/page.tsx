import { authMode, CaptainAuthCard } from '@/features/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; tab?: string }> }) {
  const params = await searchParams;
  return <CaptainAuthCard callbackError={!!params.error} initialMode={authMode(params.tab)} />;
}

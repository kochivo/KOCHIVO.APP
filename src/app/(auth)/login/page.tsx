import { CaptainAuthCard } from '@/features/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <CaptainAuthCard callbackError={!!(await searchParams).error} />;
}

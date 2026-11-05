import { ResetPasswordForm } from '@/features/auth';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ code?: string; token_hash?: string; type?: string }> }) {
  return <ResetPasswordForm {...await searchParams} />;
}

import { ResetPasswordForm } from '@/features/auth';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  return <ResetPasswordForm code={(await searchParams).code} />;
}

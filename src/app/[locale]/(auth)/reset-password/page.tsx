import { ResetPasswordForm } from '@/features/auth';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ code?: string; token_hash?: string; type?: string }> }) {
  const { code, token_hash, type } = await searchParams;
  return <ResetPasswordForm key={JSON.stringify([code, token_hash, type])} code={code} token_hash={token_hash} type={type} />;
}

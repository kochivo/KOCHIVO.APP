import { ConsentPage } from '@/features/ai-connect/server';

export default async function Page({ searchParams }: {
  searchParams: Promise<{ authorization_id?: string | string[] }>;
}) {
  return <ConsentPage authorizationId={(await searchParams).authorization_id} />;
}

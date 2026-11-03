import { PlayerInviteFlow } from '@/features/auth';

export default async function InvitePage({ params, searchParams }: {
  params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }>;
}) {
  return <PlayerInviteFlow code={(await params).code} callbackError={!!(await searchParams).error} />;
}

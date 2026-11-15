'use client';
import dynamic from 'next/dynamic';
import type { FormDraft } from '@/features/forms';
import { LoadingState } from '@/ui/loading-state';

const InviteContent = dynamic(() => import('./invite-content').then(module => module.InviteContent), {
  loading: () => <LoadingState variant="cards" />,
});
export function InvitePageEntry(props: { captainFirstName: string; assessments: FormDraft[] | null }) {
  return <InviteContent {...props} />;
}

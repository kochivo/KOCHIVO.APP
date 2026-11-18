import { redirect } from 'next/navigation';
import { captainApproval } from '@/features/roster';
import { PendingIntake } from '@/features/captain-approval';

export default async function CaptainPendingPage() {
  const status = await captainApproval();
  if (!status) redirect('/captain');
  return <PendingIntake status={status} />;
}

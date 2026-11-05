import { captainApproval } from '@/features/roster';
import { PendingIntake } from '@/features/captain-approval';

export default async function CaptainPendingPage() {
  const status = await captainApproval();
  return status && <PendingIntake status={status} />;
}

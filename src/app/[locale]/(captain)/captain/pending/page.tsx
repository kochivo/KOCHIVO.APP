import { captainApproval } from '@/features/roster';
import { CaptainPendingScreen } from '@/features/captain-approval';

export default async function CaptainPendingPage() {
  const status = await captainApproval();
  return status && <CaptainPendingScreen status={status} />;
}

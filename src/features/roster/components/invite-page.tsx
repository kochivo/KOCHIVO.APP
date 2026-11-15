import 'server-only';
import { fetchCaptainFirstName } from '../data/roster';
import { loadInviteAssessments } from '../data/invite-assessments';
import { InvitePageEntry } from './invite-page-entry';

export async function InvitePage() {
  const [captainFirstName, assessments] = await Promise.all([
    fetchCaptainFirstName(), loadInviteAssessments(new Date()).catch(() => null),
  ]);
  return <InvitePageEntry captainFirstName={captainFirstName} assessments={assessments} />;
}

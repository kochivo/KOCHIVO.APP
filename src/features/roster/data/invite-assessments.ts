import 'server-only';
import { loadAssessmentLibrary } from '@/features/forms/server';
import { rosterClient } from './client';

export async function loadInviteAssessments(now: Date) {
  const client = await rosterClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Missing session');
  const library = await loadAssessmentLibrary(client, data.user.id, now);
  return library.forms.filter(form => form.questions.length > 0);
}

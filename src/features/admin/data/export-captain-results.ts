'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../dashboard/messages';
import { captainsCsv, parseCaptainFilter } from '../dashboard-ui';
import { fetchCaptainResults } from './captain-results';

export async function exportCaptainResults(search: string, filter: string) {
  const result = await fetchCaptainResults({ search: typeof search === 'string' ? search : '', filter: parseCaptainFilter(filter) });
  if (result.error) return { error: 'captains' as const };
  if (result.activityError) return { error: 'activity' as const };
  const t = await getT(messages);
  const headers = (['csvName', 'csvEmail', 'csvTier', 'csvPlayers', 'csvLimit', 'csvEnd', 'csvState', 'lastActive'] as const).map(key => t(key));
  return { csv: captainsCsv(result.rows, result.activity, headers) };
}

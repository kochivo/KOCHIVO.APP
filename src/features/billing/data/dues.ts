import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { captainClient } from './client';

/** What each player owes the session captain; an empty map when dues can't be read. */
export async function fetchDues(): Promise<Map<string, number>> {
  try {
    const { client } = await captainClient();
    const result = await client.rpc('captain_dues');
    if (result.error) throw result.error;
    return new Map(result.data.map((row) => [row.player_id, row.due_egp]));
  } catch (error) {
    unstable_rethrow(error);
    console.warn('Dues unavailable', error);
    return new Map();
  }
}

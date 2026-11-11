import 'server-only';
import { cache } from 'react';
import { supabaseServer } from './server';

export const currentClaims = cache(async () => {
  const client = await supabaseServer();
  return client.auth.getClaims();
});

'use server';
import { z } from 'zod';
import { planClient } from './client';
export async function loadCaptainRamadanMode() {
  const client = await planClient(), user = await client.auth.getUser();
  if (user.error || !user.data.user) throw new Error('Missing session');
  const result = await client.from('profiles').select('*').eq('id', user.data.user.id).eq('role', 'captain').single();
  if (result.error) throw result.error;
  return z.object({ ramadan_mode: z.boolean() }).parse(result.data).ramadan_mode;
}

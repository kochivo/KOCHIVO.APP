'use server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';
import { PRAYER_CITIES } from '@/lib/prayer-times';
import type { RamadanDatabase } from '../ramadan/types';

async function session() {
  const raw = await supabaseServer();
  const auth = await raw.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Missing session');
  return { client: raw as unknown as SupabaseClient<RamadanDatabase>, id: auth.data.user.id };
}
export async function loadRamadan() {
  const { client, id } = await session();
  const [status, profile] = await Promise.all([client.rpc('my_ramadan'),
    client.from('profiles').select('prayer_city,timezone').eq('id', id).single()]);
  if (status.error || profile.error || !status.data[0]) throw new Error('Could not load Ramadan');
  return { ...status.data[0], city: profile.data.prayer_city, timezone: profile.data.timezone };
}
export async function loadRamadanTeam() {
  const { client, id } = await session();
  const [profile, links, exempt] = await Promise.all([
    client.from('profiles').select('ramadan_mode,ramadan_training,ramadan_intensity,ramadan_water_ml').eq('id', id).eq('role', 'captain').single(),
    client.from('coach_clients').select('player_id,profiles!coach_clients_player_id_fkey(full_name)').eq('captain_id', id).is('archived_at', null),
    client.from('ramadan_exempt').select('player_id').eq('captain_id', id),
  ]);
  if (profile.error || links.error || exempt.error) throw new Error('Could not load Ramadan team');
  return { preferences: profile.data, players: links.data.map(row => ({ id: row.player_id, name: row.profiles?.full_name ?? '' })),
    exempt: exempt.data.map(row => row.player_id) };
}
const preferences = z.object({ ramadan_mode: z.boolean(), ramadan_training: z.enum(['before_iftar_1h','after_iftar_2h','after_taraweeh','before_suhoor']),
  ramadan_intensity: z.enum(['same','lighter_20','maintenance']), ramadan_water_ml: z.number().int().min(1000).max(6000),
  exempt: z.array(z.uuid()).max(10000) }).strict();
export async function saveRamadanTeam(input: unknown) {
  const { exempt, ...patch } = preferences.parse(input);
  const { client } = await session();
  const result = await client.rpc('save_ramadan', { p_preferences: patch, p_exempt: exempt });
  if (result.error) throw result.error;
}
export async function savePrayerCity(input: unknown) {
  const city = z.string().nullable().refine(value => value === null || PRAYER_CITIES.some(city => city.code === value)).parse(input);
  const { client, id } = await session();
  const result = await client.from('profiles').update({ prayer_city: city }).eq('id', id).select('id').single();
  if (result.error) throw result.error;
}

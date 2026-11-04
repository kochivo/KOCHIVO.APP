import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';

export async function captainApproval() {
  const client = await supabaseServer();
  const { data, error } = await client.rpc('my_approval_route_profile');
  if (error) throw error;
  const row = data?.[0];
  if (!row) redirect('/login');
  if (row.suspended_at !== null) redirect('/suspended');
  if (row.is_admin) redirect('/admin');
  if (row.role !== 'captain') redirect('/player');
  if (!row.role_confirmed) redirect('/login');
  const path = (await headers()).get('x-kochivo-path') ?? '/captain';
  const unapproved = row.captain_status !== 'approved';
  if (unapproved && path !== '/captain/pending') redirect('/captain/pending');
  if (!unapproved && path === '/captain/pending') redirect('/captain');
  return row.captain_status === 'pending' || row.captain_status === 'rejected' ? row.captain_status : null;
}

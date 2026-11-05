'use server';
import { redirect } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { supabaseServer } from '@/core/supabase/server';
import { messages } from '../messages';

export async function signOutAdmin(): Promise<void> {
  const { error } = await (await supabaseServer()).auth.signOut();
  if (error) throw new Error((await getT(messages))('failed'));
  redirect('/login');
}

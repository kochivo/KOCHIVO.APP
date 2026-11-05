'use server';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { getT } from '@/core/i18n/server';
import { intakeSchema } from '../schemas';
import { messages } from '../intake/messages';

export async function loadIntake() {
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { profile: null, error: t('loadFailed') };
    const { data, error } = await client.from('profiles')
      .select('full_name,social,captain_intake,captain_status').eq('id', user.id).single();
    return { profile: data, error: error ? t('loadFailed') : null };
  } catch (error) {
    unstable_rethrow(error);
    return { profile: null, error: t('loadFailed') };
  }
}

export async function saveIntake(input: unknown) {
  const t = await getT(messages);
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) return { error: t('invalid') };
  try {
    const client = await supabaseServer();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { error: t('failed') };
    const { data: profile, error: readError } = await client.from('profiles').select('social')
      .eq('id', user.id).eq('role', 'captain').eq('captain_status', 'pending').single();
    if (readError || !profile) return { error: t('failed') };
    const { full_name, whatsapp, instagram, ...captain_intake } = parsed.data;
    const { data, error } = await client.from('profiles').update({ full_name, captain_intake,
      social: { ...profile.social, whatsapp, instagram } })
      .eq('id', user.id).eq('captain_status', 'pending').is('captain_intake', null).select('id').single();
    if (error || !data) return { error: t('failed') };
  } catch (error) {
    unstable_rethrow(error);
    return { error: t('failed') };
  }
  revalidatePath('/captain/pending');
  revalidatePath('/admin');
  return { success: true };
}

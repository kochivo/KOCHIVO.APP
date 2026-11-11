'use server';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';


import { supabaseServer } from '@/core/supabase/server';
import { settingsSchemas } from '../schema';
import type { SettingsProfile } from '../schema';

type Row = Record<string, unknown>;
type ExportTable = 'workout_sessions' | 'set_logs' | 'meal_logs' | 'check_ins' | 'form_checks' |
  'player_intake' | 'coach_clients' | 'programs' | 'nutrition_plans';
type Result<T> = { data: T; error?: never } | { error: string; data?: never };


async function ownSession() {
  const client = await supabaseServer();
  // Account deletion, export and profile writes require a fresh Auth server check.
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('unauthenticated');
  return { client, id: auth.data.user.id };
}

export async function loadSettings(): Promise<Result<SettingsProfile>> {
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: t('couldnTLoadSettingsTryAgain') };
    const id = auth.data.claims.sub;
    const result = await client.from('profiles').select('*').eq('id', id).single();
    if (result.error || !result.data) return { error: t('couldnTLoadSettingsTryAgain') };
    return { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: t('couldnTLoadSettingsTryAgain') }; }
}

export async function saveCaptainProfile(input: unknown): Promise<Result<SettingsProfile>> {
  const t = await getT(messages);
  const failure = t('couldnTSaveChangesTryAgain');
  const parsed = settingsSchemas(t).captainProfileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? failure };
  try {
    const { client, id } = await ownSession();
    const path = parsed.data.avatar_path;
    if (path && (!path.startsWith(`${id}/`) || !/^[-a-zA-Z0-9/]+\.(?:webp|jpg)$/.test(path))) return { error: failure };
    const previous = await client.from('profiles').select('avatar_path').eq('id', id).single();
    if (previous.error) return { error: failure };
    const result = await client.from('profiles').update({ ...parsed.data,
      ...(parsed.data.public_slug !== undefined ? { public_slug: parsed.data.public_slug || null } : {}),
    }).eq('id', id).eq('role', 'captain').select('*').single();
    if (result.error || !result.data) return { error: failure };
    if (path && previous.data.avatar_path && path !== previous.data.avatar_path) {
      // Cleanup is best effort: a committed profile must never be reported as rolled back.
      await client.storage.from('captain-avatars').remove([previous.data.avatar_path]).catch(() => undefined);
    }
    return { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: failure }; }
}

export async function saveProfile(input: unknown): Promise<Result<SettingsProfile>> {
  const t = await getT(messages);
  const failure = t('couldnTSaveChangesTryAgain');
  try {
    const { client, id } = await ownSession();
    const previous = await client.from('profiles').select('role,avatar_path').eq('id', id).single();
    if (previous.error || !previous.data) return { error: failure };
    const parsed = settingsSchemas(t, previous.data.role === 'player').profileSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? failure };
    const path = parsed.data.avatar_path;
    if (path && (!path.startsWith(`${id}/`) || !/^[-a-zA-Z0-9]+\/[-a-zA-Z0-9]+\.(webp|jpg)$/.test(path))) return { error: failure };
    const result = await client.from('profiles').update(parsed.data).eq('id', id).select('*').single();
    if (result.error || !result.data) return { error: failure };
    if (path && previous.data.avatar_path?.startsWith(`${id}/`) && path !== previous.data.avatar_path) {
      await client.storage.from('captain-avatars').remove([previous.data.avatar_path]).catch(() => undefined);
    }
    return { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: failure }; }
}

export async function saveInviteMessage(input: unknown): Promise<Result<SettingsProfile>> {
  const t = await getT(messages);
  const failure = t('couldnTSaveChangesTryAgain');
  const parsed = settingsSchemas(t).inviteMessageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? failure };
  try {
    const { client, id } = await ownSession();
    const profile = await client.from('profiles').select('*').eq('id', id).single();
    if (profile.error || !profile.data) return { error: failure };
    if (profile.data.role !== 'captain') return { error: t('onlyCoachesCanSetInviteMessages') };
    const result = await client.from('profiles').update(parsed.data).eq('id', id).eq('role', 'captain').select('*').single();
    if (result.error || !result.data) return { error: failure };
    return { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: failure }; }
}

export async function requestDeletion(): Promise<Result<string>> {
  const t = await getT(messages);
  const failure = t('couldnTSaveChangesTryAgain');
  try {
    const { client } = await ownSession();
    const result = await client.rpc('request_account_deletion');
    if (result.error || !result.data) return { error: failure };
    return { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: failure }; }
}

export async function cancelDeletion(): Promise<Result<null>> {
  const t = await getT(messages);
  const failure = t('couldnTSaveChangesTryAgain');
  try {
    const { client } = await ownSession();
    const result = await client.rpc('cancel_account_deletion');
    return result.error ? { error: failure } : { data: null };
  } catch (error) { unstable_rethrow(error); return { error: failure }; }
}

export async function exportMyData(): Promise<Result<{ profile: Row; rows: Record<string, Row[]> }>> {
  const t = await getT(messages);
  try {
    const { client, id } = await ownSession();
    const profile = await client.from('profiles').select('*').eq('id', id).single();
    if (profile.error || !profile.data) return { error: t('couldnTDownloadYourDataTry') };
    const captain = profile.data.role === 'captain';
    const tables: ExportTable[] = captain ? ['coach_clients', 'programs', 'nutrition_plans'] :
      ['workout_sessions', 'set_logs', 'meal_logs', 'check_ins', 'form_checks', 'player_intake'];
    const entries = await Promise.all(tables.map(async (table) => {
      const rows: Row[] = [];
      // PostgREST caps each response; page so larger histories are not silently truncated.
      for (let offset = 0; ; offset += 500) {
        const order = table === 'player_intake' ? 'player_id' : 'id';
        const result = await (captain && (table === 'coach_clients' || table === 'programs' || table === 'nutrition_plans')
          ? client.from(table).select('*').eq('captain_id', id)
          : client.from(table).select('*').eq('player_id', id))
          .order(order).range(offset, offset + 499);
        if (result.error) throw new Error('export failed');
        rows.push(...(result.data ?? []));
        if (!result.data || result.data.length < 500) break;
      }
      return [table, rows] as const;
    }));
    return { data: { profile: { ...profile.data }, rows: Object.fromEntries(entries) } };
  } catch (error) { unstable_rethrow(error); return { error: t('couldnTDownloadYourDataTry') }; }
}

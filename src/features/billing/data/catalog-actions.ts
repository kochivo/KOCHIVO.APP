'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { uuidv7 } from '@/core/offline/ids';
import { getT } from '@/core/i18n/server';
import { isPermissionDenied } from '@/core/supabase/errors';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { messages as tierMessages } from '../tiers/messages';
import { messages } from '../messages';
import { captainClient } from './client';
import { offerInput, tierInput } from './catalog-validation';
import type { Tables } from '@/types/database';
import type { ActionResult } from '../types';

async function failure(error: unknown) {
  unstable_rethrow(error);
  const t = await getT(messages);
  return { error: t(isPermissionDenied(error) ? 'denied' : 'packageFailed') };
}
function refresh() {
  revalidatePath('/captain/billing');
  revalidatePath('/c/[slug]', 'page');
}

export async function saveTier(input: unknown): Promise<ActionResult<Tables<'captain_package_tiers'>>> {
  const parsed = tierInput.safeParse(input);
  if (!parsed.success) return { error: (await getT(messages))('packageInvalid') };
  try {
    const { client, captainId } = await captainClient();
    const { id, newId, ...fields } = parsed.data;
    const table = client.from('captain_package_tiers');
    // newId lets the caller attach a first duration to the tier it is creating.
    const query = id ? table.update(fields).eq('id', id).eq('captain_id', captainId)
      : table.insert({ ...fields, id: newId ?? uuidv7(), captain_id: captainId });
    const result = await query.select().single();
    if (result.error) throw result.error;
    refresh(); return { data: result.data };
  } catch (error) { return failure(error); }
}

export async function saveOffer(input: unknown): Promise<ActionResult<Tables<'captain_offers'>>> {
  const parsed = offerInput.safeParse(input);
  if (!parsed.success) return { error: (await getT(messages))('packageInvalid') };
  try {
    const { client, captainId } = await captainClient();
    const { id, ...fields } = parsed.data;
    const table = client.from('captain_offers');
    const query = id ? table.update(fields).eq('id', id).eq('captain_id', captainId)
      : table.insert({ ...fields, id: uuidv7(), captain_id: captainId });
    const result = await query.select().single();
    if (result.error) throw result.error;
    refresh(); return { data: result.data };
  } catch (error) { return failure(error); }
}

export async function setOfferPaused(id: string, paused: boolean, now = new Date()) {
  if (!z.uuid().safeParse(id).success || typeof paused !== 'boolean' || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return { error: (await getT(messages))('packageInvalid') };
  }
  try {
    const { client, captainId } = await captainClient();
    const result = await client.from('captain_offers').update({ paused_at: paused ? now.toISOString() : null })
      .eq('id', id).eq('captain_id', captainId).select('id').single();
    if (result.error) throw result.error;
    refresh(); return { data: true as const };
  } catch (error) { return failure(error); }
}

export async function setTierArchived(id: string, archived: boolean, now = new Date()) {
  if (!z.uuid().safeParse(id).success || typeof archived !== 'boolean' || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return { error: (await getT(messages))('packageInvalid') };
  }
  try {
    const { client, captainId } = await captainClient();
    const result = await client.from('captain_package_tiers').update({ archived_at: archived ? now.toISOString() : null })
      .eq('id', id).eq('captain_id', captainId).select('id').single();
    if (result.error) throw result.error;
    refresh(); return { data: true as const };
  } catch (error) { return failure(error); }
}

type DeleteTierDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<AppDatabase['public'], 'Functions'> & {
    Functions: AppDatabase['public']['Functions'] & {
      delete_archived_package_tier: { Args: { p_tier: string }; Returns: boolean };
    };
  };
};

export async function deleteArchivedTier(id: string): Promise<ActionResult<true>> {
  if (!z.uuid().safeParse(id).success) return { error: (await getT(messages))('packageInvalid') };
  try {
    const { client } = await captainClient();
    const { data, error } = await (client as unknown as SupabaseClient<DeleteTierDatabase>)
      .rpc('delete_archived_package_tier', { p_tier: id });
    if (error && error.code !== '23503') throw error;
    if (!data) return { error: (await getT(tierMessages))('deleteTierBlocked') };
    refresh();
    return { data: true };
  } catch (error) { return failure(error); }
}

export async function assignPackageTier(packageId: string, tierId: string | null) {
  if (!z.uuid().safeParse(packageId).success || (tierId !== null && !z.uuid().safeParse(tierId).success)) {
    return { error: (await getT(messages))('packageInvalid') };
  }
  try {
    const { client, captainId } = await captainClient();
    const result = await client.from('captain_packages').update({ tier_id: tierId })
      .eq('id', packageId).eq('captain_id', captainId).select('id').single();
    if (result.error) throw result.error;
    refresh(); return { data: true as const };
  } catch (error) { return failure(error); }
}

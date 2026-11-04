'use server';

import type { Translator } from '@/core/i18n/messages';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { uuidv7 } from '@/core/offline/ids';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import { isMissingRow, isPermissionDenied, readError } from '@/core/supabase/errors';
import { fetchRoster } from '@/features/roster';
import type { RosterPlayer } from '@/features/roster';
import type { Template, TemplateKind, TemplateResult } from '../types';

const kindSchema = z.enum(['program', 'nutrition']);
const identity = z.object({ kind: kindSchema, id: z.uuid() }).strict();
const titled = identity.extend({ title: z.string().trim().min(1).max(80) });
const assignment = z.object({ kind: kindSchema, templateId: z.uuid(), playerId: z.uuid() }).strict();

function errorMessage(error: unknown, t: Translator<typeof messages>): string {
  const { code, message } = readError(error);
  if (error instanceof Error && typeof message === 'string' && [t('signInFirst'), t('templatesAreForCoachesOnly')].includes(message)) return message;
  if (isMissingRow(error, true)) return t('templateOrSourceNotFound');
  if (isPermissionDenied(error)) return t('youDontHavePermission');
  if (code === '22023') return t('templateNameMustBe1To80');
  return t('requestFailedTryAgain');
}
async function session() {
  const t = await getT(messages);
  const client = await supabaseServer();
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) throw new Error(t('signInFirst'));
  const captain = user.data.user.id;
  const profile = await client.from('profiles').select('role').eq('id', captain).single();
  if (profile.error) throw profile.error;
  if (profile.data?.role !== 'captain') throw new Error(t('templatesAreForCoachesOnly'));
  return { client, captain };
}
const tableFor = (kind: TemplateKind) => kind === 'program' ? 'programs' : 'nutrition_plans';

export async function createTemplate(input: unknown): Promise<TemplateResult<string>> {
  const t = await getT(messages);
  const parsed = z.object({ kind: kindSchema }).strict().safeParse(input);
  if (!parsed.success) return { error: t('checkTheTemplateTypeNameAndPlayer') };
  try {
    const { client, captain } = await session();
    const id = uuidv7();
    const result = await client.from(tableFor(parsed.data.kind)).insert({
      id, captain_id: captain, player_id: null, is_template: true, title: t('blankTitle'), status: 'draft',
    });
    if (result.error) throw result.error;
    revalidatePath('/captain/templates');
    return { data: id };
  } catch (error) { unstable_rethrow(error); return { error: errorMessage(error, t) }; }
}

export async function listTemplates(): Promise<TemplateResult<Template[]>> {
  const t = await getT(messages);
  try {
    const { client, captain } = await session();
    const templates: Template[] = [];
    for (const kind of kindSchema.options) {
      const rows = kind === 'program'
        ? await client.from('programs').select('id,title,created_at,is_starter,program_days(count)')
          .eq('captain_id', captain).eq('is_template', true).order('created_at', { ascending: false })
        : await client.from('nutrition_plans').select('id,title,created_at,is_starter,meals(count)')
          .eq('captain_id', captain).eq('is_template', true).order('created_at', { ascending: false });
      if (rows.error) throw rows.error;
      templates.push(...rows.data.map(row => ({ id: row.id, title: row.title, created_at: row.created_at, kind, starter: row.is_starter,
        count: ('program_days' in row ? row.program_days[0]?.count : row.meals[0]?.count) ?? 0 })));
    }
    return { data: templates.sort((a, b) => b.created_at.localeCompare(a.created_at)) };
  } catch (error) { unstable_rethrow(error); return { error: errorMessage(error, t) }; }
}

export async function saveAsTemplate(input: unknown): Promise<TemplateResult<string>> {
  const t = await getT(messages);
  const parsed = titled.safeParse(input);
  if (!parsed.success) return { error: t('checkTheTemplateTypeNameAndPlayer') };
  const { kind, id, title } = parsed.data;
  try {
    const { client } = await session();
    const result = kind === 'program'
      ? await client.rpc('program_to_template', { p_program: id, p_title: title })
      : await client.rpc('nutrition_plan_to_template', { p_plan: id, p_title: title });
    if (result.error) throw result.error;
    if (!result.data) return { error: t('templateOrSourceNotFound') };
    revalidatePath('/captain/templates');
    return { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: errorMessage(error, t) }; }
}

export async function assignTemplate(input: unknown): Promise<TemplateResult<string>> {
  const t = await getT(messages);
  const parsed = assignment.safeParse(input);
  if (!parsed.success) return { error: t('checkTheTemplateTypeNameAndPlayer') };
  const { kind, templateId, playerId } = parsed.data;
  try {
    const { client } = await session();
    const result = await client.rpc(kind === 'program' ? 'assign_program_template' : 'assign_nutrition_template',
      { p_template: templateId, p_player: playerId });
    if (result.error?.code === '22023') return { error: t('templateIsEmptyAddDaysOrMeals') };
    if (result.error) throw result.error;
    if (!result.data) return { error: t('templateOrSourceNotFound') };
    revalidatePath(`/captain/players/${playerId}/${kind === 'program' ? 'programs' : 'nutrition'}`);
    revalidatePath('/captain');
    return { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: errorMessage(error, t) }; }
}

export async function copyTemplate(input: unknown): Promise<TemplateResult<string>> {
  const t = await getT(messages);
  const parsed = titled.safeParse(input);
  if (!parsed.success) return { error: t('checkTheTemplateTypeNameAndPlayer') };
  const { kind, id, title } = parsed.data;
  try {
    const { client } = await session();
    const result = await client.rpc('copy_template', { p_kind: kind, p_template: id, p_title: title });
    if (result.error) throw result.error;
    revalidatePath('/captain/templates');
    return { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: errorMessage(error, t) }; }
}

export async function renameTemplate(input: unknown): Promise<TemplateResult<true>> {
  const t = await getT(messages);
  const parsed = titled.safeParse(input);
  if (!parsed.success) return { error: t('checkTheTemplateTypeNameAndPlayer') };
  const { kind, id, title } = parsed.data;
  try {
    const { client, captain } = await session();
    const result = await client.from(tableFor(kind)).update({ title }).eq('id', id)
      .eq('captain_id', captain).eq('is_template', true).select('id').single();
    if (result.error) throw result.error;
    if (!result.data) return { error: t('templateOrSourceNotFound') };
    revalidatePath('/captain/templates');
    return { data: true };
  } catch (error) { unstable_rethrow(error); return { error: errorMessage(error, t) }; }
}

export async function deleteTemplate(input: unknown): Promise<TemplateResult<true>> {
  const t = await getT(messages);
  const parsed = identity.safeParse(input);
  if (!parsed.success) return { error: t('checkTheTemplateTypeNameAndPlayer') };
  const { kind, id } = parsed.data;
  try {
    const { client, captain } = await session();
    const result = await client.from(tableFor(kind)).delete().eq('id', id)
      .eq('captain_id', captain).eq('is_template', true).select('id').single();
    if (result.error) throw result.error;
    if (!result.data) return { error: t('templateOrSourceNotFound') };
    revalidatePath('/captain/templates');
    return { data: true };
  } catch (error) { unstable_rethrow(error); return { error: errorMessage(error, t) }; }
}

export async function listTemplatePlayers(): Promise<TemplateResult<RosterPlayer[]>> {
  const t = await getT(messages);
  try {
    await session();
    const result = await fetchRoster();
    return result.error !== undefined ? { error: result.error } : { data: result.players };
  } catch (error) { unstable_rethrow(error); return { error: errorMessage(error, t) }; }
}

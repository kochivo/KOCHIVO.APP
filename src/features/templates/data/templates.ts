'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import { fetchRoster } from '@/features/roster';
import type { RosterPlayer } from '@/features/roster';
import type { Template, TemplateKind, TemplateResult, TemplatesDatabase } from '../types';

const kindSchema = z.enum(['program', 'nutrition']);
const identity = z.object({ kind: kindSchema, id: z.uuid() }).strict();
const titled = identity.extend({ title: z.string().trim().min(1).max(80) });
const assignment = z.object({ kind: kindSchema, templateId: z.uuid(), playerId: z.uuid() }).strict();
const invalid = 'راجع نوع القالب والاسم واللاعب';
const unavailable = 'القالب أو المصدر مش موجود';
const failed = 'الطلب متنفذش. جرّب تاني';

function errorMessage(error: unknown): string {
  if (error instanceof Error && ['سجّل دخولك الأول', 'القوالب للكباتن بس'].includes(error.message)) return error.message;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    switch (error.code) {
      case 'P0002': case 'PGRST116': return unavailable;
      case '42501': return 'مش مسموح لك تعمل كده';
      case '22023': return 'اسم القالب لازم يكون من 1 لـ80 حرف';
    }
  }
  return failed;
}
async function session() {
  // Match the other captain features until the shared generated schema replaces its placeholder.
  const client = await supabaseServer() as unknown as SupabaseClient<TemplatesDatabase>;
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) throw new Error('سجّل دخولك الأول');
  const captain = user.data.user.id;
  const profile = await client.from('profiles').select('role').eq('id', captain).single();
  if (profile.error) throw profile.error;
  if (profile.data?.role !== 'captain') throw new Error('القوالب للكباتن بس');
  return { client, captain };
}
const tableFor = (kind: TemplateKind) => kind === 'program' ? 'programs' : 'nutrition_plans';

export async function listTemplates(): Promise<TemplateResult<Template[]>> {
  try {
    const { client, captain } = await session();
    const templates: Template[] = [];
    for (const kind of kindSchema.options) {
      const rows = kind === 'program'
        ? await client.from('programs').select('id,title,created_at,program_days(count)')
          .eq('captain_id', captain).eq('is_template', true).order('created_at', { ascending: false })
        : await client.from('nutrition_plans').select('id,title,created_at,meals(count)')
          .eq('captain_id', captain).eq('is_template', true).order('created_at', { ascending: false });
      if (rows.error) throw rows.error;
      templates.push(...rows.data.map(row => ({ id: row.id, title: row.title, created_at: row.created_at, kind,
        count: ('program_days' in row ? row.program_days[0]?.count : row.meals[0]?.count) ?? 0 })));
    }
    return { data: templates.sort((a, b) => b.created_at.localeCompare(a.created_at)) };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function saveAsTemplate(input: unknown): Promise<TemplateResult<string>> {
  const parsed = titled.safeParse(input);
  if (!parsed.success) return { error: invalid };
  const { kind, id, title } = parsed.data;
  try {
    const { client } = await session();
    const result = kind === 'program'
      ? await client.rpc('program_to_template', { p_program: id, p_title: title })
      : await client.rpc('nutrition_plan_to_template', { p_plan: id, p_title: title });
    if (result.error) throw result.error;
    if (!result.data) return { error: unavailable };
    revalidatePath('/captain/templates');
    return { data: result.data };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function assignTemplate(input: unknown): Promise<TemplateResult<string>> {
  const parsed = assignment.safeParse(input);
  if (!parsed.success) return { error: invalid };
  const { kind, templateId, playerId } = parsed.data;
  try {
    const { client } = await session();
    const result = await client.rpc(kind === 'program' ? 'assign_program_template' : 'assign_nutrition_template',
      { p_template: templateId, p_player: playerId });
    if (result.error) throw result.error;
    if (!result.data) return { error: unavailable };
    revalidatePath(`/captain/players/${playerId}/${kind === 'program' ? 'programs' : 'nutrition'}`);
    revalidatePath('/captain');
    return { data: result.data };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function renameTemplate(input: unknown): Promise<TemplateResult<true>> {
  const parsed = titled.safeParse(input);
  if (!parsed.success) return { error: invalid };
  const { kind, id, title } = parsed.data;
  try {
    const { client, captain } = await session();
    const result = await client.from(tableFor(kind)).update({ title }).eq('id', id)
      .eq('captain_id', captain).eq('is_template', true).select('id').single();
    if (result.error) throw result.error;
    if (!result.data) return { error: unavailable };
    revalidatePath('/captain/templates');
    return { data: true };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function deleteTemplate(input: unknown): Promise<TemplateResult<true>> {
  const parsed = identity.safeParse(input);
  if (!parsed.success) return { error: invalid };
  const { kind, id } = parsed.data;
  try {
    const { client, captain } = await session();
    const result = await client.from(tableFor(kind)).delete().eq('id', id)
      .eq('captain_id', captain).eq('is_template', true).select('id').single();
    if (result.error) throw result.error;
    if (!result.data) return { error: unavailable };
    revalidatePath('/captain/templates');
    return { data: true };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function listTemplatePlayers(): Promise<TemplateResult<RosterPlayer[]>> {
  try {
    await session();
    const result = await fetchRoster();
    return result.error !== undefined ? { error: result.error } : { data: result.players };
  } catch (error) { return { error: errorMessage(error) }; }
}

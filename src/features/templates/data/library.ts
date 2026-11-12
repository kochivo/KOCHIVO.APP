'use server';

import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { supabaseServer } from '@/core/supabase/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { trainingMetadata } from '../library-model';
import type { LibraryTemplate } from '../library-types';
import type { TemplateKind, TemplateResult } from '../types';
import { messages } from '../messages';
const planRows = z.array(z.object({ id: z.string(), title: z.string(), created_at: z.string(),
  is_starter: z.boolean(), status: z.string(), target_protein: z.number().nullable(),
  meals: z.array(z.object({ id: z.string(), day_type: z.string().optional() })) }));

async function templateUsage(client: Awaited<ReturnType<typeof supabaseServer>>, kind: TemplateKind, captain: string, ids: string[]) {
  const usage = new Map<string, Set<string>>();
  if (!ids.length) return usage;
  // Recursive FK embeds cannot distinguish the source template from its assigned copies.
  for (let start = 0; ; start += 1000) {
    const result = await client.from(kind === 'program' ? 'programs' : 'nutrition_plans')
      .select('source_template_id,player_id,status').eq('captain_id', captain)
      .in('source_template_id', ids).neq('status', 'archived').order('id').range(start, start + 999);
    if (result.error) throw result.error;
    for (const row of result.data) {
      if (!row.source_template_id || !row.player_id) continue;
      const players = usage.get(row.source_template_id) ?? new Set<string>();
      players.add(row.player_id);
      usage.set(row.source_template_id, players);
    }
    if (result.data.length < 1000) return usage;
  }
}

export async function listLibraryTemplates(kind: TemplateKind): Promise<TemplateResult<LibraryTemplate[]>> {
  const t = await getT(messages);
  if (!captainWorkspaceEnabled() || !['program', 'nutrition'].includes(kind)) return { error: t('requestFailedTryAgain') };
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: t('signInFirst') };
    const captain = auth.data.claims.sub;
    if (kind === 'program') {
      const result = await client.from('programs').select('id,title,created_at,is_starter,status,settings,program_days(is_rest_day)')
        .eq('captain_id', captain).eq('is_template', true).order('created_at', { ascending: false });
      if (result.error) throw result.error;
      const usage = await templateUsage(client, kind, captain, result.data.map(row => row.id));
      return { data: result.data.map(row => ({ id: row.id, title: row.title, created_at: row.created_at,
        starter: row.is_starter, kind, count: row.program_days.filter(day => !day.is_rest_day).length,
        uses: usage.get(row.id)?.size ?? 0, archived: row.status === 'archived', ...trainingMetadata(row.settings) })) };
    }
    const result = await client.from('nutrition_plans').select('id,title,created_at,is_starter,status,target_protein,meals(id,day_type)')
      .eq('captain_id', captain).eq('is_template', true).order('created_at', { ascending: false });
    if (result.error) throw result.error;
    const usage = await templateUsage(client, kind, captain, result.data.map(row => row.id));
    return { data: planRows.parse(result.data).map(row => ({ id: row.id, title: row.title, created_at: row.created_at,
      starter: row.is_starter, kind, count: row.meals.length, protein: row.target_protein,
      split: row.meals.some(meal => meal.day_type === 'training' || meal.day_type === 'rest'), uses: usage.get(row.id)?.size ?? 0, archived: row.status === 'archived' })) };
  } catch { return { error: t('couldntLoadTemplatesTryAgain') }; }
}

export async function archiveLibraryTemplate(input: { id: string; kind: TemplateKind; archived: boolean }): Promise<TemplateResult<true>> {
  const t = await getT(messages);
  const parsed = z.object({ id: z.uuid(), kind: z.enum(['program', 'nutrition']), archived: z.boolean() }).safeParse(input);
  if (!captainWorkspaceEnabled() || !parsed.success) return { error: t('requestFailedTryAgain') };
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: t('signInFirst') };
    const result = await client.from(input.kind === 'program' ? 'programs' : 'nutrition_plans')
      .update({ status: input.archived ? 'archived' : 'draft' }).eq('id', input.id).eq('captain_id', auth.data.claims.sub)
      .eq('is_template', true).eq('is_starter', false).select('id').single();
    return result.error ? { error: t('couldntSaveChangesTryAgain') } : { data: true };
  } catch { return { error: t('couldntSaveChangesTryAgain') }; }
}

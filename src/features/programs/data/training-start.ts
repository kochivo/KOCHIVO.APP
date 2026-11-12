'use server';

import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { loadProgram, saveProgram } from './program-io';
import type { ProgramDraft, Result } from '../types';

export async function trainingTemplates(): Promise<Result<{ id: string; title: string }[]>> {
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (!auth.data?.claims.sub || auth.error) return { error: t('couldntLoadProgramsTryAgain') };
    const result = await client.from('programs').select('id,title').eq('captain_id', auth.data.claims.sub)
      .eq('is_template', true).order('created_at', { ascending: false });
    return result.error ? { error: t('couldntLoadProgramsTryAgain') } : { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: t('couldntLoadProgramsTryAgain') }; }
}

export async function startTraining(playerId: string, templateId?: string): Promise<Result<ProgramDraft>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(playerId).success || (templateId && !z.uuid().safeParse(templateId).success))
    return { error: t('checkThePlayerAndProgramName') };
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (!auth.data?.claims.sub || auth.error) return { error: t('couldntCreateTheProgramTryAgain') };
    let template: ProgramDraft | undefined;
    if (templateId) {
      const owned = await client.from('programs').select('id').eq('id', templateId)
        .eq('captain_id', auth.data.claims.sub).eq('is_template', true).single();
      if (owned.error) return { error: t('programNotFound') };
      const loaded = await loadProgram(templateId);
      if (!loaded.data) return { error: loaded.error };
      template = loaded.data;
    }
    const id = uuidv7();
    const settings = template?.settings && typeof template.settings === 'object' && !Array.isArray(template.settings) ? template.settings : {};
    const draft: ProgramDraft = { id, player_id: playerId, title: template?.title ?? t('programs'), status: 'draft', settings,
      repeatWeekly: template?.repeatWeekly ?? false, days: (template?.days ?? []).map(day => {
        const dayId = uuidv7();
        return { ...day, id: dayId, program_id: id,
          exercises: day.exercises.map(row => ({ ...row, id: uuidv7(), day_id: dayId })),
          cardio: day.cardio?.map(row => ({ ...row, id: uuidv7(), day_id: dayId })) };
      }) };
    const created = await client.from('programs').insert({ id, player_id: playerId, captain_id: auth.data.claims.sub,
      title: draft.title, status: 'draft', is_template: false, settings: { ...settings, repeatWeekly: draft.repeatWeekly } });
    if (created.error) return { error: t('couldntCreateTheProgramTryAgain') };
    if (draft.days.length) {
      const saved = await saveProgram(draft);
      if (!saved.ok) {
        await client.from('programs').delete().eq('id', id).eq('status', 'draft');
        return { error: saved.error };
      }
    }
    return { data: draft };
  } catch (error) { unstable_rethrow(error); return { error: t('couldntCreateTheProgramTryAgain') }; }
}

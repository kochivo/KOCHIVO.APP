'use server';

import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { getT } from '@/core/i18n/server';
import type { Tables } from '@/types/database';
import { listLibraryTemplates } from '../data/library';
import { messages } from '../messages';
import { programWeek } from './workspace-program-model';
import type { TemplateResult } from '../types';
import type { WorkspaceProgram } from './workspace-program-card';

export async function readWorkspacePrograms(): Promise<TemplateResult<WorkspaceProgram[]>> {
  const result = await listLibraryTemplates('program');
  if (result.error !== undefined) return result;
  const templates = result.data.filter(template => !template.archived);
  if (!templates.length) return { data: [] };
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    const days: Pick<Tables<'program_days'>, 'program_id' | 'weekday' | 'is_rest_day'>[] = [];
    // Each owned weekly template has at most seven scheduled days; batches stay below the API row limit.
    for (let start = 0; start < templates.length; start += 100) {
      const schedules = await client.from('program_days').select('program_id,weekday,is_rest_day')
        .in('program_id', templates.slice(start, start + 100).map(template => template.id)).not('weekday', 'is', null);
      if (schedules.error) throw schedules.error;
      days.push(...schedules.data);
    }
    return { data: templates.map(template => ({ ...template,
      weekdays: programWeek(days.filter(day => day.program_id === template.id)) })) };
  } catch (error) {
    unstable_rethrow(error);
    return { error: t('couldntLoadTemplatesTryAgain') };
  }
}

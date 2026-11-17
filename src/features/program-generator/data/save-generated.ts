'use server';

import { createProgram, saveProgram, activateProgram } from '@/features/programs';
import { createTemplate } from '@/features/templates';
import { getT } from '@/core/i18n/server';
import { unstable_rethrow } from 'next/navigation';
import { messages } from '../messages';
import { toProgramDraft } from '../generate';
import type { GeneratedProgram } from '../generate';

export async function saveGenerated(generated: GeneratedProgram, title: string, mode: 'assign' | 'template' | 'edit', existingId?: string):
  Promise<{ data: string; error?: never } | { error: string; programId?: string; data?: never }> {
  const t = await getT(messages);
  let programId = existingId;
  try {
    if (mode === 'assign' && !generated.player_id) return { error: t('saveError') };
    if (!programId) {
      const created = generated.player_id ? await createProgram(generated.player_id, title) : await createTemplate({ kind: 'program', title });
      if (created.error !== undefined) return { error: created.error };
      programId = created.data;
    }
    const saved = await saveProgram(toProgramDraft(generated, programId, title));
    if (!saved.ok) return { error: saved.error, programId };
    if (mode === 'assign') {
      const activated = await activateProgram(programId);
      if (!activated.ok) return { error: activated.error, programId };
    }
    return { data: programId };
  } catch (error) { unstable_rethrow(error); return { error: t('saveError'), programId }; }
}

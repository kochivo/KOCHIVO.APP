import 'server-only';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { readProgram } from '@/features/programs/server';
import { getLocale } from '@/core/i18n/server';
import { createT } from '@/core/i18n/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { TrainingContent } from './training-content';
import { TemplateTrainingEntry } from './template-entry';
import { messages } from './messages';

const playerProgram = z.object({ is_template: z.literal(false), is_starter: z.literal(false), player_id: z.uuid() });
export async function ProgramTrainingEntry({ programId }: { programId: string }) {
  if (!captainWorkspaceEnabled() || !z.uuid().safeParse(programId).success) notFound();
  const result = await readProgram(programId), t = createT(messages, await getLocale());
  if (result.error !== undefined) return <div role="alert" className="glass rounded-card p-5 text-danger"><p>{t('error')}</p><Link className="inline-flex min-h-12 items-center" href={`/captain/programs/${programId}`}>{t('retry')}</Link></div>;
  // The authorized reader filters by captain; validate the editable shape as well.
  if (result.data.player_id === null) return <TemplateTrainingEntry planId={programId} />;
  const parsed = playerProgram.safeParse(result.data);
  if (!parsed.success) notFound();
  return <TrainingContent playerId={parsed.data.player_id} initial={result.data} />;
}

import { secondaryButtonClass } from '@/ui/secondary-button-class';
import 'server-only';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getLocale } from '@/core/i18n/server';
import { createT } from '@/core/i18n/messages';
import { readProgram } from '@/features/programs/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages } from './messages';

const TrainingEditorEntry = dynamic(() => import('./training-editor-entry').then(module => module.TrainingEditorEntry));
// loadProgram carries these persisted fields; validate them before exposing an editable template.
const editableTemplate = z.object({ is_template: z.literal(true), is_starter: z.literal(false), player_id: z.null() });

export async function TemplateTrainingEntry({ planId }: { planId: string }) {
  if (!captainWorkspaceEnabled() || !z.uuid().safeParse(planId).success) notFound();
  const locale = await getLocale(), t = createT(messages, locale);
  const result = await readProgram(planId);
  if (result.error !== undefined) return <div role="alert" className="glass rounded-card p-card text-danger">
    <p>{t('error')}</p><Link className={`${secondaryButtonClass} inline-flex min-h-12 items-center text-ink`} href={`/captain/templates?plan=${planId}`}>{t('retry')}</Link>
  </div>;
  if (!editableTemplate.safeParse(result.data).success) notFound();
  return <TrainingEditorEntry key={result.data.id} mode="template" initial={result.data} programs={[]} loadingLabel={t('loading')} />;
}

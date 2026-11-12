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
import { messages as templateMessages } from './template-messages';

const TrainingEditorEntry = dynamic(() => import('./training-editor-entry').then(module => module.TrainingEditorEntry));
// loadProgram carries these persisted fields; validate them before exposing an editable template.
const editableTemplate = z.object({ is_template: z.literal(true), is_starter: z.literal(false), player_id: z.null() });

export async function TemplateTrainingEntry({ planId }: { planId: string }) {
  if (!captainWorkspaceEnabled() || !z.uuid().safeParse(planId).success) notFound();
  const locale = await getLocale(), t = createT(messages, locale), tt = createT(templateMessages, locale);
  const result = await readProgram(planId);
  if (result.error !== undefined) return <div role="alert" className="glass rounded-card p-5 text-danger">
    <p>{t('error')}</p><Link className="inline-flex min-h-12 items-center text-ink" href={`/captain/templates?plan=${planId}`}>{t('retry')}</Link>
  </div>;
  if (!editableTemplate.safeParse(result.data).success) notFound();
  return <div className="min-w-0 space-y-[18px]">
    <header className="flex flex-wrap items-center gap-3.5">
      <div className="me-auto"><p className="text-xs text-faint">{tt('title')}</p>
        <h1 className="break-words font-display text-[30px] font-semibold leading-tight">{result.data.title}</h1></div>
      <Link className="inline-flex min-h-12 items-center text-sm text-muted" href="/captain/templates">{tt('back')}</Link>
    </header>
    <TrainingEditorEntry mode="template" initial={result.data} programs={[]} loadingLabel={t('loading')} />
  </div>;
}

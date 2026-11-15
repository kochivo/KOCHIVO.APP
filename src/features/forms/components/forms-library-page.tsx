import 'server-only';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { getArabicStyle } from '@/core/i18n/server';
import { loadAssessmentLibrary } from '../data/assessment-library';
import { formCopy } from '../form-copy';
import { messages as redesign } from '../redesign/messages';
import { templateCopyForAction } from '../template-copy';
import { templates } from '../templates';
import { FormsLibraryEntry } from './forms-library-entry';
import { AssessmentLibraryList } from './assessment-library-list';
import { AssessmentLibraryMetrics } from './assessment-library-metrics';
import { TemplateLinkEntry } from './template-link-entry';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { workspaceMessages } from '../messages';
import { V11LibraryList } from './v11-library-list';
import { KoPlus } from '@/ui/icons/ko-plus';
import { buttonClass, Button } from '@/ui/button';

export async function FormsLibraryPage({ captain, client, locale, query, now = new Date() }: {
  captain: string; client: SupabaseClient<AppDatabase>; locale: Locale;
  query: { edit?: string; template?: string; draft?: string };
  now?: Date;
}) {
  const style = await getArabicStyle();
  const workspace = captainWorkspaceEnabled(), w = createT(workspaceMessages, locale, style);
  const m = formCopy(locale, style), t = createT(redesign, locale, style), base = `/${locale}/captain/library/forms`;
  const data = await loadAssessmentLibrary(client, captain, now).catch(() => null);
  if (!data) return <div role="alert" className="glass rounded-card p-card text-danger">{m.loadError}
    <Link href={base} prefetch={false} className={buttonClass({ variant: 'secondary', block: false, className: "ms-stack inline-flex items-center min-h-12 px-page-x" })}>{m.retry}</Link></div>;
  if (query.template && query.template !== 'custom' && !templates.some(t => (t.key ?? t.kind) === query.template)) notFound();
  if (query.draft && !z.uuid().safeParse(query.draft).success) notFound();
  const candidate = query.edit ? data.forms.find(f => f.id === query.edit) : query.template && query.draft
    ? await templateCopyForAction(query.template, captain, query.draft, locale) : null;
  const form = candidate ? data.forms.find(f => f.id === candidate.id) ?? candidate : null;
  if (query.edit && !form) notFound();
  const active = data.forms.filter(f => f.schedule || data.schedules.some(s => s.form_id === f.id && !s.paused_at)).length;
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-card-gap">
    {!form && workspace && <><PageBarTitle title={w('title')} /><PageBarActions><Button type="button" popoverTarget="assessment-templates" variant={'primary'} block={false} className={"press inline-flex min-h-12 cursor-pointer items-center gap-inline px-page-x text-sm font-semibold focus-visible:ring-2 focus-visible:ring-lime"}><KoPlus aria-hidden className="size-4" />{w('newForm')}</Button></PageBarActions></>}
    {!form && !workspace && <header className="flex flex-wrap items-center gap-card-gap">
      <div className="me-auto"><h1 className="font-display text-stat font-semibold leading-tight">{m.title}</h1>
        <p className="mt-inline text-row text-muted">{t('subline', { n: active, m: data.waitingReview })}</p></div>
      <TemplateLinkEntry href={`${base}?template=custom`} primary>{m.newForm}</TemplateLinkEntry>
    </header>}
    {query.template && !query.draft && !query.edit && <TemplateLinkEntry href={`${base}?template=${query.template}`}>
      {t('useTemplate')}
    </TemplateLinkEntry>}
    <FormsLibraryEntry key={form?.id ?? 'list'} form={form ?? null} locale={locale} players={data.players.length}
      scheduleContext={{ schedules: data.schedules.filter(s => s.form_id === form?.id), players: data.players, ready: data.forms.some(f => f.id === form?.id) }}>
      {workspace ? <V11LibraryList data={data} locale={locale} style={style} /> : <AssessmentLibraryList data={data} locale={locale} style={style} />}
    </FormsLibraryEntry>
    {!form && !workspace && <AssessmentLibraryMetrics data={data} locale={locale} style={style} />}
  </div>;
}

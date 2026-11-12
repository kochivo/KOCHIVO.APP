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
import { LibrarySchedulesEntry } from './library-schedules-entry';

export async function FormsLibraryPage({ captain, client, locale, query, now = new Date() }: {
  captain: string; client: SupabaseClient<AppDatabase>; locale: Locale;
  query: { edit?: string; template?: string; draft?: string };
  now?: Date;
}) {
  const style = await getArabicStyle();
  const m = formCopy(locale, style), t = createT(redesign, locale, style), base = `/${locale}/captain/library/forms`;
  const data = await loadAssessmentLibrary(client, captain, now).catch(() => null);
  if (!data) return <div role="alert" className="glass rounded-card p-5 text-danger">{m.loadError}
    <Link href={base} prefetch={false} className="ms-3 inline-flex min-h-12 items-center px-3">{m.retry}</Link></div>;
  if (query.template && query.template !== 'custom' && !templates.some(t => (t.key ?? t.kind) === query.template)) notFound();
  if (query.draft && !z.uuid().safeParse(query.draft).success) notFound();
  const candidate = query.edit ? data.forms.find(f => f.id === query.edit) : query.template && query.draft
    ? await templateCopyForAction(query.template, captain, query.draft, locale) : null;
  const form = candidate ? data.forms.find(f => f.id === candidate.id) ?? candidate : null;
  if (query.edit && !form) notFound();
  const active = data.forms.filter(f => f.schedule || data.schedules.some(s => s.form_id === f.id && !s.paused_at)).length;
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-[18px]">
    {!form && <header className="flex flex-wrap items-center gap-[14px]">
      <div className="me-auto"><h1 className="font-display text-[30px] font-semibold leading-tight">{m.title}</h1>
        <p className="mt-1 text-[13px] text-muted">{t('subline', { n: active, m: data.waitingReview })}</p></div>
      <TemplateLinkEntry href={`${base}?template=custom`} primary>{m.newForm}</TemplateLinkEntry>
    </header>}
    {query.template && !query.draft && !query.edit && <TemplateLinkEntry href={`${base}?template=${query.template}`}>
      {t('useTemplate')}
    </TemplateLinkEntry>}
    <FormsLibraryEntry key={form?.id ?? 'list'} form={form ?? null} locale={locale} players={data.players.length}
      scheduleContext={{ schedules: data.schedules.filter(s => s.form_id === form?.id), players: data.players, ready: data.forms.some(f => f.id === form?.id) }}>
      <AssessmentLibraryList data={data} locale={locale} style={style} />
    </FormsLibraryEntry>
    {!form && <AssessmentLibraryMetrics data={data} locale={locale} style={style} />}
    {form && <LibrarySchedulesEntry formId={form.id} locale={locale} ready={data.forms.some(f => f.id === form.id)} />}
  </div>;
}

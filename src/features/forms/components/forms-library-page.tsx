import 'server-only';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { Locale } from '@/core/i18n/locale';
import { loadAssessmentLibrary } from '../data/assessment-library';
import { messages } from '../messages';
import { copyTemplate } from '../model';
import { templates } from '../templates';
import { FormsLibraryEntry } from './forms-library-entry';
import { AssessmentLibraryList } from './assessment-library-list';
import { AssessmentLibraryMetrics } from './assessment-library-metrics';
import { AssessmentScheduleEntry } from './assessment-schedule-entry';
import { messages as assessmentMessages } from '../assessments/messages';

export async function FormsLibraryPage({ captain, client, locale, query }: {
  captain: string; client: SupabaseClient<AppDatabase>; locale: Locale;
  query: { edit?: string; template?: string };
}) {
  const m = messages[locale], base = `/${locale}/captain/library/forms`;
  const data = await loadAssessmentLibrary(client, captain, new Date()).catch(() => null);
  if (!data) return <div role="alert" className="text-danger">{m.loadError}
    <Link href={base} prefetch={false} className="ms-3 inline-flex min-h-12 items-center px-3">{m.retry}</Link></div>;
  const template = templates.find(template => (template.key ?? template.kind) === query.template);
  const form = query.edit ? data.forms.find(form => form.id === query.edit)
    : template ? copyTemplate(template, captain, undefined, locale) : null;
  if (query.edit && !form || query.template && !template) notFound();
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-5">
    <header className="flex flex-wrap items-center gap-4">
      <div className="me-auto"><h1 className="font-display text-[30px] font-semibold leading-tight">{m.title}</h1>
        <p className="mt-1 text-sm text-muted">{assessmentMessages[locale].subline}</p></div>
      <a href="#templates" className={`flex min-h-12 items-center gap-2 rounded-full px-5 font-bold ${form ? 'glass' : 'bg-lime text-on-lime'}`}><Plus aria-hidden className="size-4" />{m.newForm}</a>
    </header>
    <AssessmentLibraryMetrics data={data} locale={locale} />
    <FormsLibraryEntry key={form?.id ?? 'list'} form={form ?? null} locale={locale}>
      <AssessmentLibraryList data={data} locale={locale} selected={form?.id} />
    </FormsLibraryEntry>
    {query.edit && <AssessmentScheduleEntry formId={query.edit} locale={locale} />}
    <p className="text-xs text-faint">{m.active}: {data.metrics.active} · {m.sent}: {data.metrics.sent}</p>
  </div>;
}

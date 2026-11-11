import 'server-only';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { Locale } from '@/core/i18n/locale';
import { loadLibrary } from '../data/library';
import { messages } from '../messages';
import { copyTemplate } from '../model';
import { templates } from '../templates';
import { FormsLibraryEntry } from './forms-library-entry';
import { LibraryList } from './library-list';
import { LibraryMetrics } from './library-metrics';

export async function FormsLibraryPage({ captain, client, locale, query }: {
  captain: string; client: SupabaseClient<AppDatabase>; locale: Locale;
  query: { edit?: string; template?: string };
}) {
  const m = messages[locale], base = `/${locale}/captain/library/forms`;
  const data = await loadLibrary(client, captain, new Date()).catch(() => null);
  if (!data) return <div role="alert" className="text-danger">{m.loadError}
    <Link href={base} prefetch={false} className="ms-3 inline-flex min-h-12 items-center px-3">{m.retry}</Link></div>;
  const template = templates.find(template => template.kind === query.template);
  const form = query.edit ? data.forms.find(form => form.id === query.edit)
    : template ? copyTemplate(template, captain, undefined, locale) : null;
  if (query.edit && !form || query.template && !template) notFound();
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-5">
    <header className="flex flex-wrap items-center gap-4">
      <div className="me-auto"><p className="text-sm text-muted">{m.library}</p><h1 className="text-3xl font-bold">{m.title}</h1></div>
      <span className="text-sm text-muted">{m.period}</span>
      <a href="#templates" className="flex min-h-12 items-center rounded-control bg-lime px-5 font-bold text-on-lime">{m.newForm}</a>
    </header>
    <LibraryMetrics metrics={data.metrics} locale={locale} />
    <FormsLibraryEntry key={form?.id ?? 'list'} form={form ?? null} locale={locale}>
      <LibraryList data={data} locale={locale} selected={form?.id} />
    </FormsLibraryEntry>
  </div>;
}

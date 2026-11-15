import 'server-only';
import Link from 'next/link';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import { templates } from '../templates';
import type { LibraryData } from '../types';
import { FormCard } from './form-card';
import { buttonClass } from '@/ui/button';

export function LibraryList({ data, locale, selected }: { data: LibraryData; locale: Locale; selected?: string }) {
  const m = messages[locale], base = `/${locale}/captain/library/forms`;
  return <aside className="space-y-stack" aria-label={m.title}>
    {!data.forms.length && <p className="glass rounded-card p-card text-muted">{m.empty}</p>}
    {data.forms.map(form => <FormCard key={form.id} title={form.title} count={form.questions.length}
      metrics={data.byForm[form.id]} selected={selected === form.id} locale={locale} href={`${base}?edit=${form.id}`} />)}
    <section id="templates" className="space-y-stack" aria-label={m.templates}>
      <h2 className="font-bold">{m.templates}</h2>
      {templates.filter(template => !template.key).map(template => <FormCard key={template.kind} title={m.kinds[template.kind]}
        count={template.questions.length} locale={locale} href={`${base}?template=${template.kind}`} />)}
    </section>
    {selected && <Link href={base} prefetch={false} className={buttonClass({ variant: 'secondary', block: false, className: "block py-stack min-h-12 px-page-x" })}>{m.close}</Link>}
  </aside>;
}

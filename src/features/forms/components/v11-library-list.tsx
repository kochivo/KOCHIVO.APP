import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { KoPlus } from '@/ui/icons/ko-plus';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { assessmentWeekday, recurrenceLabel } from '../assessment-summary';
import type { AssessmentLibraryData } from '../data/assessment-library';
import { TemplateLinkEntry } from './template-link-entry';

export function V11LibraryList({ data, locale, style }: { data: AssessmentLibraryData; locale: Locale; style?: ArabicStyle }) {
  const t = createT(workspaceMessages, locale, style), m = formCopy(locale, style), base = `/${locale}/captain/library/forms`;
  return <div className="grid gap-3 min-[761px]:grid-cols-3">
    {!data.forms.length && <p className="glass rounded-card p-5 text-muted">{m.empty}</p>}
    {data.forms.map(form => {
      const schedules = data.schedules.filter(s => s.form_id === form.id), active = schedules.find(s => !s.paused_at);
      const schedule = form.schedule ? `${form.schedule.every === 'week' ? `${m.week} ${assessmentWeekday(form.schedule.weekday, locale)}` : `${m.month} ${form.schedule.day}`} · ${form.schedule.hour}:00`
        : schedules[0] ? recurrenceLabel(active ?? schedules[0], locale) : t('manual');
      const status = form.schedule || active ? 'active' : schedules.length ? 'stopped' : 'manual';
      const metrics = data.byForm[form.id];
      return <Link key={form.id} href={`${base}?edit=${form.id}`} prefetch={false} className="glass flex min-h-12 min-w-0 flex-col gap-2 rounded-card border border-line-soft p-4 text-start">
        <div className="flex items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface"><ClipboardList aria-hidden className="size-4" /></span>
          <b className="min-w-0 break-words text-sm">{form.title}</b><span className={`ms-auto shrink-0 rounded-full px-2 py-1 text-[11px] ${status === 'active' ? 'bg-lime-soft text-lime' : 'bg-surface text-muted'}`}>{t(status)}</span></div>
        <small className="text-muted">{form.kind === 'custom' ? t('manual') : m.kinds[form.kind]} · {schedule} · {form.questions.length} {m.questions}</small>
        <div className="mt-1 flex items-center justify-between text-xs"><span className="text-muted">{t('responses')}</span><b dir="ltr">{metrics?.answered ?? 0}/{metrics?.sent ?? 0}</b></div>
      </Link>;
    })}
    <section className="glass flex min-h-32 flex-col items-center justify-center gap-1 rounded-card border border-line-soft p-4">
      <TemplateLinkEntry href={`${base}?template=custom`}><KoPlus aria-hidden className="size-5 text-lime" /><span className="text-lime">{t('newForm')}</span></TemplateLinkEntry>
      <small className="text-muted">{t('start')}</small>
    </section>
  </div>;
}

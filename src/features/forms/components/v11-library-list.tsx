import Link from 'next/link';
import { ChevronLeft, ClipboardList } from 'lucide-react';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { assessmentWeekday, recurrenceLabel } from '../assessment-summary';
import type { AssessmentLibraryData } from '../data/assessment-library';
import { V11TemplateChooser } from './v11-template-chooser';
import { questionCount } from '../question-count';
import { clickableClass } from '@/ui/button';

export function V11LibraryList({ data, locale, style }: { data: AssessmentLibraryData; locale: Locale; style?: ArabicStyle }) {
  const t = createT(workspaceMessages, locale, style), m = formCopy(locale, style), base = `/${locale}/captain/library/forms`;
  return <><div className="grid gap-card-gap min-[760px]:grid-cols-2 xl:grid-cols-3">
    {!data.forms.length && <p className="glass rounded-card p-card text-muted min-[760px]:col-span-full">{m.empty}</p>}
    {data.forms.map(form => {
      const schedules = data.schedules.filter(s => s.form_id === form.id), active = schedules.find(s => !s.paused_at);
      const schedule = form.schedule ? `${form.schedule.every === 'week' ? `${m.week} ${assessmentWeekday(form.schedule.weekday, locale)}` : `${m.month} ${form.schedule.day}`} · ${form.schedule.hour}:00`
        : schedules[0] ? recurrenceLabel(active ?? schedules[0], locale) : t('manual');
      const status = form.schedule || active ? 'active' : schedules.length ? 'stopped' : 'manual';
      const metrics = data.byForm[form.id];
      return <Link key={form.id} href={`${base}?edit=${form.id}`} prefetch={false} className={`${clickableClass} glass flex min-h-12 min-w-0 flex-col gap-stack rounded-card p-card text-start`}>
        <div className="flex items-center gap-inline"><span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface"><ClipboardList aria-hidden className="size-4" /></span>
          <b className="min-w-0 break-words text-md">{form.title}</b><span className={`ms-auto shrink-0 rounded-md px-inline text-micro font-semibold ${status === 'active' ? 'tone-lime' : 'tone-neutral'}`}>{t(status)}</span></div>
        <small className="text-muted">{form.kind === 'custom' ? t('manual') : m.kinds[form.kind]} · {schedule}</small>
        <div className="flex flex-wrap items-center justify-between gap-inline border-t border-line-soft pt-stack text-xs text-muted">
          <span>{questionCount(form.questions.length, locale, style)}</span>
          <span className="tabular-nums" title={m.period}>{t('recipientCount', { n: metrics?.recipients ?? 0 })}</span>
        </div>
        <div className="flex items-center gap-inline text-xs"><span className="text-muted">{t('responses')}</span><b className="ms-auto tabular-nums" dir="ltr">{metrics?.answered ?? 0}/{metrics?.sent ?? 0}</b><ChevronLeft aria-hidden className="dir-icon size-4" /></div>
      </Link>;
    })}
  </div><V11TemplateChooser locale={locale} style={style} /></>;
}

import Link from 'next/link';
import { ChevronLeft, ClipboardList } from 'lucide-react';
import { KoPlus } from '@/ui/icons/ko-plus';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { assessmentWeekday, recurrenceLabel } from '../assessment-summary';
import type { AssessmentLibraryData } from '../data/assessment-library';
import { V11TemplateChooser } from './v11-template-chooser';
import { questionCount } from '../question-count';
import { buttonClass, Button } from '@/ui/button';

export function V11LibraryList({ data, locale, style }: { data: AssessmentLibraryData; locale: Locale; style?: ArabicStyle }) {
  const t = createT(workspaceMessages, locale, style), m = formCopy(locale, style), base = `/${locale}/captain/library/forms`;
  return <><div className="grid gap-stack min-[761px]:grid-cols-3">
    {!data.forms.length && <p className="glass rounded-card p-card text-muted">{m.empty}</p>}
    {data.forms.map(form => {
      const schedules = data.schedules.filter(s => s.form_id === form.id), active = schedules.find(s => !s.paused_at);
      const schedule = form.schedule ? `${form.schedule.every === 'week' ? `${m.week} ${assessmentWeekday(form.schedule.weekday, locale)}` : `${m.month} ${form.schedule.day}`} · ${form.schedule.hour}:00`
        : schedules[0] ? recurrenceLabel(active ?? schedules[0], locale) : t('manual');
      const status = form.schedule || active ? 'active' : schedules.length ? 'stopped' : 'manual';
      const metrics = data.byForm[form.id];
      return <Link key={form.id} href={`${base}?edit=${form.id}`} prefetch={false} className={buttonClass({ variant: 'secondary', block: false, className: "press flex min-h-12 min-w-0 cursor-pointer flex-col gap-inline p-card text-start focus-visible:ring-2 focus-visible:ring-lime" })}>
        <div className="flex items-center gap-inline"><span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface"><ClipboardList aria-hidden className="size-4" /></span>
          <b className="min-w-0 break-words text-sm">{form.title}</b><span className={`ms-auto shrink-0 rounded-full px-inline py-inline text-micro ${status === 'active' ? 'bg-lime-soft text-lime' : 'bg-surface text-muted'}`}>{t(status)}</span></div>
        <small className="text-muted">{form.kind === 'custom' ? t('manual') : m.kinds[form.kind]} · {schedule} · {questionCount(form.questions.length, locale, style)}</small>
        <div className="mt-inline flex items-center gap-inline text-xs"><span className="text-muted">{t('responses')}</span><b className="ms-auto" dir="ltr">{metrics?.answered ?? 0}/{metrics?.sent ?? 0}</b><ChevronLeft aria-hidden className="dir-icon size-4" /></div>
      </Link>;
    })}
    <section className="glass flex min-h-32 flex-col items-center justify-center gap-inline rounded-card border border-line-soft p-card">
      <Button type="button" popoverTarget="assessment-templates" variant={'secondary'} block={false} className={"press flex min-h-12 cursor-pointer items-center gap-inline px-page-x focus-visible:ring-2 focus-visible:ring-lime"}><KoPlus aria-hidden className="size-5" /><span>{t('newForm')}</span></Button>
      <small className="text-muted">{t('start')}</small>
    </section>
  </div><V11TemplateChooser locale={locale} style={style} /></>;
}

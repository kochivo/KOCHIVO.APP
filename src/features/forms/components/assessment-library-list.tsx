import Link from 'next/link';
import { CalendarDays, ChevronLeft, Clock, Plus, Repeat, Users, Zap } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { AssessmentLibraryData } from '../data/assessment-library';
import { assessmentTime, assessmentWeekday, recurrenceLabel } from '../assessment-summary';
import { messages } from '../assessments/messages';
import { messages as formMessages } from '../messages';

export function AssessmentLibraryList({ data, locale, selected }: { data: AssessmentLibraryData; locale: Locale; selected?: string }) {
  const t = createT(messages, locale), base = `/${locale}/captain/library/forms`;
  const links = [['checkin', t('weeklyTemplate')], ['progress', t('monthlyTemplate')], ['onboarding', t('intakeTemplate')], ['photos', t('photosTemplate')],
    ['injury', formMessages[locale].kinds.injury], ['update', formMessages[locale].kinds.update]];
  return <div className="min-w-0">
    <div className="glass overflow-hidden rounded-card border border-line-soft">
      {!data.forms.length && <p className="p-5 text-faint">{t('empty')}</p>}
      {data.forms.map(f => {
        const schedules = data.schedules.filter(s => s.form_id === f.id);
        const s = schedules[0], m = data.byForm[f.id], rate = m?.sent ? Math.round(m.answered / m.sent * 100) : null;
        const targetIds = new Set(schedules.flatMap(s => s.player_id ? [s.player_id] : []));
        const target = f.schedule || schedules.some(s => !s.player_id) ? t('all') : targetIds.size === 1
          ? data.players.find(p => targetIds.has(p.id))?.name ?? t('players', { n: 1 }) : t('players', { n: targetIds.size || m?.recipients || 0 });
        const Icon = s?.kind === 'on_join' ? Zap : s?.kind === 'days' || s?.kind === 'once' ? Clock : f.schedule?.every === 'week' || s?.kind === 'week' ? Repeat : CalendarDays;
        const label = f.schedule ? f.schedule.every === 'week'
          ? t('repeatWeek', { day: assessmentWeekday(f.schedule.weekday, locale) })
          : t('repeatMonth', { n: f.schedule.day }) : s ? recurrenceLabel(s, locale) : t('manual');
        return <Link key={f.id} href={`${base}?edit=${f.id}`} prefetch={false} aria-current={selected === f.id ? 'page' : undefined}
          className="grid min-h-[70px] grid-cols-[minmax(0,1fr)_24px] items-center gap-x-3 gap-y-2 border-b border-line-soft px-5 py-4 text-start last:border-0 min-[1200px]:grid-cols-[minmax(0,1fr)_150px_170px_120px_24px]">
          <div className="min-w-0"><b className="break-words font-medium">{f.title}</b><small className="mt-1 block text-xs text-faint">
            {t('questions', { n: f.questions.length })}{f.questions.length > 0 && <> · {f.questions.slice(0, 4).map(q => locale === 'ar' ? q.label_ar : q.label_en).join('، ')}</>}</small></div>
          <span className="col-start-1 flex items-center gap-2 text-[12.5px] text-muted min-[1200px]:col-auto"><Users aria-hidden className="size-4 shrink-0" />{s?.kind === 'on_join' ? t('newPlayer') : target}</span>
          <span className="col-start-1 flex items-center gap-2 text-[12.5px] min-[1200px]:col-auto"><Icon aria-hidden className="size-4 shrink-0 text-lime" />{label}
            {!f.schedule && s && s.kind !== 'on_join' && <> · {assessmentTime(s, locale)}</>}{f.schedule?.every === 'week' && <> · {assessmentTime({ hour: f.schedule.hour, minute: 0 }, locale)}</>}
            {schedules.length > (f.schedule ? 0 : 1) && <small className="text-faint">{t('moreSchedules', { n: schedules.length - (f.schedule ? 0 : 1) })}</small>}</span>
          <span className="col-start-1 font-display font-extrabold tabular-nums text-muted min-[1200px]:col-auto">{rate === null ? formMessages[locale].unanswered : t('response', { n: rate })}</span>
          <ChevronLeft aria-hidden className="col-start-2 row-start-1 size-5 text-faint ltr:rotate-180 min-[1200px]:col-auto" />
        </Link>;
      })}
    </div>
    <section id="templates" className="mt-3" aria-label={formMessages[locale].templates}>
      <h2 className="mb-2 text-xs text-faint">{formMessages[locale].templates}</h2>
      <div className="flex flex-wrap gap-2">{links.slice(0,4).map(([kind, title]) => <Link key={kind} href={`${base}?template=${kind}`} prefetch={false}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-soft px-4 text-xs text-muted"><Plus aria-hidden className="size-4" />{title}</Link>)}</div>
      <details className="mt-2 text-xs text-faint"><summary className="min-h-12 cursor-pointer py-3">{t('moreTemplates')}</summary>
        <div className="flex flex-wrap gap-2">{links.slice(4).map(([kind, title]) => <Link key={kind} href={`${base}?template=${kind}`} prefetch={false}
          className="inline-flex min-h-12 items-center rounded-full border border-line-soft px-4">{title}</Link>)}</div>
      </details>
    </section>
  </div>;
}

import { IconButton } from '@/ui/icon-button';
import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import Link from 'next/link';
import { Ellipsis, Plus } from 'lucide-react';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { AssessmentLibraryData } from '../data/assessment-library';
import { assessmentWeekday, recurrenceLabel } from '../assessment-summary';
import { messages } from '../redesign/messages';
import { formCopy } from '../form-copy';
import { messages as assessmentMessages } from '../assessments/messages';
import { TemplateLinkEntry } from './template-link-entry';
import { questionCaption } from '../question-caption';
import { buttonClass } from '@/ui/button';

export function AssessmentLibraryList({ data, locale, style }: { data: AssessmentLibraryData; locale: Locale; selected?: string; style?: ArabicStyle }) {
  const PlusIcon = captainWorkspaceEnabled() ? KoPlus : Plus;
  const t = createT(messages, locale, style), base = `/${locale}/captain/library/forms`;
  const m = formCopy(locale, style);
  const links = [['checkin', t('weekly')], ['progress', t('monthly')], ['onboarding', t('intake')],
    ['injury', t('injury')], ['feedback', t('feedback')]];
  return <div className="min-w-0">
    <div className="grid gap-[14px] min-[1001px]:grid-cols-3">
      {!data.forms.length && <p className="glass rounded-card border border-line-soft p-5 text-faint">{m.empty}</p>}
      {data.forms.map(f => {
        const schedules = data.schedules.filter(s => s.form_id === f.id), active = schedules.filter(s => !s.paused_at);
        const s = active[0] ?? schedules[0], activity = data.activity[f.id];
        const all = Boolean(f.schedule || schedules.some(s => !s.player_id));
        const ids = new Set(schedules.flatMap(s => s.player_id ? [s.player_id] : []));
        const target = all ? t('forAll', { n: data.players.length }) : ids.size === 1
          ? t('forPlayer', { name: data.players.find(p => ids.has(p.id))?.name ?? '' }) : t('players', { n: ids.size });
        const schedule = f.schedule ? f.schedule.every === 'week' ? t('weeklyDay', { day: assessmentWeekday(f.schedule.weekday, locale) })
          : f.schedule.day === 1 ? t('firstMonth') : t('monthlyDay', { n: f.schedule.day }) : s ? recurrenceLabel(s, locale) : t('manual');
        const last = activity?.lastAnswer;
        const hours = last ? Math.max(0, Math.floor((Date.parse(data.now) - Date.parse(last)) / 3600000)) : 0;
        const date = hours < 24 ? hours < 1 ? t('today') : hours === 1 ? t('hoursAgoOne') : hours === 2 ? t('hoursAgoTwo') : t('hoursAgo', { n: hours }) : hours < 48 ? t('yesterday')
          : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: data.timezone }).format(new Date(last ?? data.now));
        return <article key={f.id} className="glass relative flex min-w-0 flex-col gap-[10px] rounded-card border border-line-soft px-5 py-[18px]">
          <div className="flex items-center gap-2 text-[11.5px]">
            <span className={`rounded-full px-[10px] py-[3px] ${f.schedule || active.length ? 'bg-lime-soft text-lime' : 'bg-surface text-muted'}`}>{t(f.schedule || active.length ? 'active' : 'stopped')}</span>
            {activity && activity.waiting > 0 && <span className="ms-auto rounded-full bg-warn-soft px-[10px] py-[3px] text-warn">{t('waiting', { n: activity.waiting })}</span>}
          </div>
          <h2 className="font-display text-[18px] font-semibold"><Link href={`${base}?edit=${f.id}`} prefetch={false} className="before:absolute before:inset-0 before:rounded-card">{f.title}</Link></h2>
          <div className="text-[12.5px] leading-[1.9] text-muted">
            <p className="break-words">{t('questions', { n: f.questions.length, list: f.questions.map(q => questionCaption(q, f.kind, locale, style)).join('، ') })}</p>
            <p>{schedule}{(all || ids.size > 0 || s?.kind === 'on_join') && <> · {s?.kind === 'on_join' ? t('onJoin') : target}</>}</p>
            {schedules.length > (f.schedule ? 0 : 1) && <p className="text-xs text-faint">{createT(assessmentMessages, locale, style)('moreSchedules', { n: schedules.length - (f.schedule ? 0 : 1) })}</p>}
          </div>
          <footer className="mt-auto flex items-center gap-2 border-t border-line-soft pt-[10px] text-xs text-faint">
            <span>{last ? t('lastAnswer', { date }) : t(activity?.sent ? 'noAnswer' : 'neverSent')}</span>
            <div className="relative z-10 -my-[17px] ms-auto">
              <IconButton aria-label={t('menu')} popoverTarget={`assessment-menu-${f.id}`}><Ellipsis aria-hidden className="size-5" /></IconButton>
              <div id={`assessment-menu-${f.id}`} popover="auto" className="glass-strong fixed m-0 min-w-40 rounded-control border border-line p-2 [inset:auto] [position-area:block-end_span-inline-start]">
                <Link href={`${base}?edit=${f.id}`} prefetch={false} className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center px-3" })}>{t('edit')}</Link>
                <Link href={`${base}?edit=${f.id}#schedules`} prefetch={false} className={buttonClass({ variant: 'secondary', block: false, className: "mt-1 flex min-h-12 items-center px-3" })}>{t('schedule')}</Link>
              </div>
            </div>
          </footer>
        </article>;
      })}
    </div>
    <section id="templates" className="mt-[22px]" aria-label={t('templates')}>
      <h2 className="mb-[18px] text-xs text-faint">{t('templates')}</h2>
      <div className="flex flex-wrap gap-2">{links.map(([kind, title]) => <TemplateLinkEntry key={kind} href={`${base}?template=${kind}`}>
        <PlusIcon aria-hidden className="size-4" />{title}
      </TemplateLinkEntry>)}</div>
      <details className="mt-2 text-xs text-faint"><summary className="min-h-12 cursor-pointer py-3">{createT(assessmentMessages, locale, style)('moreTemplates')}</summary>
        <div className="flex flex-wrap gap-2"><TemplateLinkEntry href={`${base}?template=photos`}>{t('photos')}</TemplateLinkEntry>
          <TemplateLinkEntry href={`${base}?template=update`}>{m.kinds.update}</TemplateLinkEntry></div>
      </details>
    </section>
  </div>;
}

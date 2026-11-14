import { ChevronLeft, X } from 'lucide-react';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { templates } from '../templates';
import { questionCount } from '../question-count';
import { assessmentTime, assessmentWeekday } from '../assessment-summary';
import { TemplateLinkEntry } from './template-link-entry';

export function V11TemplateChooser({ locale, style }: { locale: Locale; style?: ArabicStyle }) {
  const t = createT(workspaceMessages, locale, style), m = formCopy(locale, style);
  const base = `/${locale}/captain/library/forms`;
  return <section id="assessment-templates" popover="auto" aria-label={t('newForm')}
    className="glass-strong fixed m-auto max-h-[85dvh] w-[min(720px,92vw)] overflow-hidden rounded-[24px] border border-line p-5 text-ink">
    <header className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">{t('newForm')}</h2>
      <button type="button" popoverTarget="assessment-templates" popoverTargetAction="hide" aria-label={m.close}
        className="glass press grid min-h-12 min-w-12 cursor-pointer place-items-center rounded-full border border-line focus-visible:ring-2 focus-visible:ring-lime"><X aria-hidden className="size-4" /></button></header>
    <div className="grid max-h-[calc(85dvh-7rem)] gap-3 overflow-y-auto [scrollbar-width:thin] min-[761px]:grid-cols-2">
      {templates.map(template => {
        const key = template.key ?? template.kind, schedule = template.schedule;
        const name = key === 'photos' ? t('photosTemplate') : key === 'feedback' ? t('feedbackTemplate') : m.kinds[template.kind];
        const timing = schedule ? `${schedule.every === 'week' ? `${m.week} ${assessmentWeekday(schedule.weekday, locale)}` : `${m.month} ${schedule.day}`} · ${assessmentTime({ hour: schedule.hour, minute: 0 }, locale)}` : m.noSchedule;
        return <TemplateLinkEntry key={key} href={`${base}?template=${key}`} card>
          <b>{name}</b><p className="text-xs text-muted">{t(key === 'photos' ? 'photosDescription' : key)}</p>
          <small className="text-muted">{questionCount(template.questions.length, locale, style)} · {timing}</small>
          <ChevronLeft aria-hidden className="dir-icon ms-auto size-4" />
        </TemplateLinkEntry>;
      })}
      <TemplateLinkEntry href={`${base}?template=custom`} card><b>{t('scratch')}</b><p className="text-xs text-muted">{t('scratchDescription')}</p><ChevronLeft aria-hidden className="dir-icon ms-auto size-4" /></TemplateLinkEntry>
    </div>
  </section>;
}

import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { RequestData } from '@/features/forms';
import { formatDateAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { messages } from './messages';
import { RowLink } from '@/ui/row-link';
import { v11Messages } from './v11-messages';

export function AssessmentCards({ requests, locale, timezone, playerId }: { requests: RequestData[]; locale: Locale; timezone: string; playerId: string }) {
  const t = createT(messages, locale);
  const answered = requests.filter(row => row.request.answered_at);
  return <>{answered.length ? answered.map(row => <section key={row.request.id} className="glass rounded-card border border-line-soft p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">{row.title}</h2>
      <span className="text-xs text-muted">{formatDateAr(localDate(new Date(row.request.answered_at ?? row.request.sent_at), timezone), { day: 'numeric', month: 'long' }, locale)}</span></div>
    <dl className="flex flex-wrap gap-3 text-sm text-muted">{row.answers.flatMap(answer => {
      const question = row.questions.find(question => question.id === answer.question_id);
      return question && typeof answer.value === 'number' ? [<div key={answer.id} className="flex gap-2">
        <dt>{locale === 'en' ? question.label_en ?? question.label_ar : question.label_ar}</dt><dd>{formatNumber(answer.value, locale)}</dd>
      </div>] : [];
    })}</dl>
    <RowLink href={`/captain/players/${playerId}/assessments?requestId=${row.request.id}#assessment-details`} className="glass mt-3 text-sm">{createT(v11Messages, locale)('open')}</RowLink>
  </section>) : <p className="glass rounded-card p-5 text-sm text-muted">{t('noAssessments')}</p>}</>;
}

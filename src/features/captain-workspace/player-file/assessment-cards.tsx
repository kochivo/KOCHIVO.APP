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
  return <>{answered.length ? answered.map(row => <section key={row.request.id} className="glass rounded-card border border-line-soft p-card">
    <div className="mb-stack flex flex-wrap items-center justify-between gap-inline"><h2 className="text-sm font-semibold">{row.title}</h2>
      <span className="text-xs text-muted">{formatDateAr(localDate(new Date(row.request.answered_at ?? row.request.sent_at), timezone), { day: 'numeric', month: 'long' }, locale)}</span></div>
    <dl className="flex flex-wrap gap-stack text-sm text-muted">{[...row.questions].sort((a, b) => a.position - b.position).flatMap(question => {
      const answer = row.answers.find(item => item.question_id === question.id);
      const text = typeof answer?.value === 'string' ? answer.value.trim() : '';
      const shown = typeof answer?.value === 'number' ? formatNumber(answer.value, locale) : text.length > 60 ? `${text.slice(0, 60)}…` : text;
      return answer && shown ? [<div key={answer.id} className="flex gap-inline">
        <dt>{locale === 'en' ? question.label_en ?? question.label_ar : question.label_ar}</dt><dd><bdi>{shown}</bdi></dd>
      </div>] : [];
    })}</dl>
    <RowLink href={`/captain/players/${playerId}/assessments?requestId=${row.request.id}#assessment-details`} className="glass mt-stack text-sm">{createT(v11Messages, locale)('open')}</RowLink>
  </section>) : <p className="glass rounded-card p-card text-sm text-muted">{t('noAssessments')}</p>}</>;
}

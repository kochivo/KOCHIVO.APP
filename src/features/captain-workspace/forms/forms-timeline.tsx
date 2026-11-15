import { Button } from '@/ui/button';
import { Repeat2 } from 'lucide-react';
import { useTimezone } from '@/core/timezone/client';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { PlayerForm } from './adapter';
import { formDate, formSummary } from './format';
import { messages } from './messages';

export function FormsTimeline({ forms, selectedId, locale, onSelect, dueAt, disabled = false, showLegacyReminder = true }: {
  forms: PlayerForm[]; selectedId?: string; locale: Locale; onSelect: (form: PlayerForm) => void; dueAt?: string; disabled?: boolean;showLegacyReminder?:boolean;
}) {
  const t = createT(messages, locale);
  const timezone = useTimezone();
  return <div className="space-y-card-gap">
    <div className="flex items-center gap-stack rounded-card border border-line p-section">
      <Repeat2 aria-hidden strokeWidth={1.5} className="size-6 shrink-0 text-lime" />
      <div className="min-w-0 flex-1"><h2 className="font-bold">{t('weekly')}</h2>
        <p className="text-sm text-muted">{t('everyWeek')}</p>
        {dueAt && <p className="text-sm text-muted">{t('due', { date: formDate(dueAt, locale, timezone) })}</p>}
      </div>
      {showLegacyReminder && <span title={t('reminderHint')}><Button variant="secondary" type="button" disabled title={t('reminderHint')}
        className="min-h-12 rounded-control px-stack text-sm text-muted disabled:opacity-50">{t('reminder')}</Button></span>}
    </div>
    {!forms.length ? <p role="status" className="p-section text-muted">{t('empty')}</p> :
      <ol aria-label={t('title')} className="divide-y divide-line overflow-hidden rounded-card border border-line">
        {forms.map(form => {
          const source = form.snapshot.source;
          const selected = source.id === selectedId;
          const summary = formSummary(form, locale);
          return <li key={`${source.kind}:${source.id}`}>
            <button type="button" disabled={disabled} aria-current={selected ? true : undefined} aria-controls="player-form-detail"
              onClick={() => onSelect(form)} className={`min-h-12 w-full space-y-inline p-section text-start ${selected ? 'bg-lime-soft' : 'hover:bg-surface-raised'}`}>
              <span className="flex flex-wrap items-center justify-between gap-inline">
                <span className="font-bold">{t(source.kind === 'intake' ? 'intake' : 'checkin')}</span>
                <span className={form.reviewedAt ? 'text-sm text-muted' : 'text-sm text-warn'}>{t(form.reviewedAt ? 'reviewed' : 'new')}</span>
              </span>
              <span className="block text-sm text-muted">{formDate(source.at, locale, timezone)}</span>
              <span title={summary} className="block truncate text-sm">{summary}</span>
            </button>
          </li>;
        })}
      </ol>}
  </div>;
}

import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { Chip } from '@/ui/chip';
import type { AssessmentInput } from '../assessment-schema';
import { messages } from '../assessments/messages';
import { messages as formMessages } from '../messages';

const input = 'mt-2 min-h-12 w-full min-w-0 rounded-control border border-line-soft bg-surface px-3 font-display tabular-nums';
const selected = 'aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg-deep';
export function AssessmentFields({ value: s, onChange, locale, allowOnJoin = true }: {
  value: AssessmentInput; onChange: (s: AssessmentInput) => void; locale: Locale; allowOnJoin?: boolean;
}) {
  const t = createT(messages, locale);
  const end = s.ends_on !== null ? 'date' : s.max_times !== null ? 'count' : 'forever';
  return <>
    <h2 className="mb-3 mt-[18px] font-display text-[19px] font-semibold">{t('when')}</h2>
    <div className="flex flex-wrap gap-2">
      {(['once', 'week', 'month', 'days', 'on_join'] as const).filter(kind => allowOnJoin || kind !== 'on_join').map(kind => <Chip key={kind} pressed={s.kind === kind}
        className={selected}
        onClick={() => onChange({ ...s, kind, every_days: kind === 'days' ? 3 : null,
          weekday: kind === 'week' ? 5 : null, day: kind === 'month' ? 1 : null })}>{t(kind)}</Chip>)}
    </div>
    <div className="my-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {s.kind === 'days' && <label className="glass rounded-card border border-line-soft p-4 text-xs text-muted">{t('every')}
        <input type="number" min={2} max={60} value={s.every_days ?? ''} className={input} onChange={e => onChange({ ...s, every_days: Number(e.target.value) })} />{t('daysUnit')}</label>}
      {s.kind === 'week' && <label className="glass rounded-card border border-line-soft p-4 text-xs text-muted">{t('weekday')}
        <select className={input} value={s.weekday ?? 5} onChange={e => onChange({ ...s, weekday: Number(e.target.value) })}>
          {formMessages[locale].weekdays.map((day, n) => <option key={day} value={n}>{day}</option>)}
        </select></label>}
      {s.kind === 'month' && <label className="glass rounded-card border border-line-soft p-4 text-xs text-muted">{t('monthDay')}
        <input type="number" min={1} max={31} value={s.day ?? ''} className={input} onChange={e => onChange({ ...s, day: Number(e.target.value) })} /></label>}
      <label className="glass rounded-card border border-line-soft p-4 text-xs text-muted">{t('hour')}
        <input type="time" required className={input} value={`${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`}
          onChange={e => { const [hour, minute] = e.target.value.split(':').map(Number); onChange({ ...s, hour: hour ?? 0, minute: minute ?? 0 }); }} /></label>
      <label className="glass rounded-card border border-line-soft p-4 text-xs text-muted">{t('starts')}
        <input type="date" required className={input} value={s.starts_on} onChange={e => onChange({ ...s, starts_on: e.target.value })} /></label>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Chip className={selected} pressed={end === 'forever'} onClick={() => onChange({ ...s, ends_on: null, max_times: null })}>{t('forever')}</Chip>
      <Chip className={selected} pressed={end === 'date'} onClick={() => onChange({ ...s, ends_on: s.ends_on ?? s.starts_on, max_times: null })}>{t('until')}</Chip>
      <Chip className={selected} pressed={end === 'count'} onClick={() => onChange({ ...s, ends_on: null, max_times: s.max_times ?? 2 })}>{t('times')}</Chip>
      {end === 'date' && <input aria-label={t('until')} type="date" min={s.starts_on} required className={`${input} max-w-48`} value={s.ends_on ?? ''} onChange={e => onChange({ ...s, ends_on: e.target.value })} />}
      {end === 'count' && <input aria-label={t('times')} type="number" min={1} max={10000} required className={`${input} max-w-24`} value={s.max_times ?? ''} onChange={e => onChange({ ...s, max_times: Number(e.target.value) })} />}
    </div>
    <h2 className="mb-3 mt-[18px] font-display text-[19px] font-semibold">{t('unanswered')}</h2>
    <div className="flex flex-wrap gap-2">{([null, 12, 24] as const).map(hours => <Chip className={selected} key={String(hours)} pressed={s.remind_after_hours === hours}
      onClick={() => onChange({ ...s, remind_after_hours: hours })}>{t(hours === null ? 'noReminder' : hours === 12 ? 'remind12' : 'remind24')}</Chip>)}</div>
  </>;
}

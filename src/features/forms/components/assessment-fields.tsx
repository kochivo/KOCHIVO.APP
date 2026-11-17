import { NumberInput } from '@/ui/number-input';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { editableFieldClass } from '@/ui/edit-in-place';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { Chip } from '@/ui/chip';
import type { AssessmentInput } from '../assessment-schema';
import { messages } from '../assessments/messages';
import { messages as formMessages } from '../messages';
import { ThemedSelect } from './themed-select';

const input = 'mt-inline min-h-12 w-full min-w-0 rounded-control border border-line-soft bg-surface px-stack font-display tabular-nums';
const selected = 'aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg-deep';
export function AssessmentFields({ value: s, onChange, locale, allowOnJoin = true, style }: {
  value: AssessmentInput; onChange: (s: AssessmentInput) => void; locale: Locale; allowOnJoin?: boolean; style?: ArabicStyle;
}) {
  const t = createT(messages, locale, style);
  const end = s.ends_on !== null ? 'date' : s.max_times !== null ? 'count' : 'forever';
  return <>
    <h2 className="mb-stack mt-card-gap font-display text-title font-semibold">{t('when')}</h2>
    <div className="flex flex-wrap gap-inline">
      {(['once', 'week', 'month', 'days', 'on_join'] as const).filter(kind => allowOnJoin || kind !== 'on_join').map(kind => <Chip key={kind} pressed={s.kind === kind}
        className={selected}
        onClick={() => onChange({ ...s, kind, every_days: kind === 'days' ? 3 : null,
          weekday: kind === 'week' ? 5 : null, day: kind === 'month' ? 1 : null })}>{t(kind)}</Chip>)}
    </div>
    <div className="my-stack grid grid-cols-1 gap-stack sm:grid-cols-3">
      {s.kind === 'days' && <label className="glass rounded-card border border-line-soft p-card text-xs text-muted">{t('every')}
        <NumberInput min={2} max={60} value={s.every_days ?? ''} className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} onCommit={value => onChange({ ...s, every_days: value })} />{t('daysUnit')}</label>}
      {s.kind === 'week' && <div className="glass flex flex-wrap items-center gap-stack rounded-card border border-line-soft p-card text-xs text-muted"><span>{t('weekday')}</span>
        <ThemedSelect label={t('weekday')} value={String(s.weekday ?? 5)} onChange={value => onChange({ ...s, weekday: Number(value) })}
          options={formMessages[locale].weekdays.map((label, n) => ({ label, value: String(n) }))} /></div>}
      {s.kind === 'month' && <label className="glass rounded-card border border-line-soft p-card text-xs text-muted">{t('monthDay')}
        <NumberInput min={1} max={31} value={s.day ?? ''} className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} onCommit={value => onChange({ ...s, day: value })} /></label>}
      <label className="glass rounded-card border border-line-soft p-card text-xs text-muted">{t('hour')}
        <input type="time" required className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} value={`${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`}
          onChange={e => { const [hour, minute] = e.target.value.split(':').map(Number); onChange({ ...s, hour: hour ?? 0, minute: minute ?? 0 }); }} /></label>
      <label className="glass rounded-card border border-line-soft p-card text-xs text-muted">{t('starts')}
        <input type="date" required className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} value={s.starts_on} onChange={e => onChange({ ...s, starts_on: e.target.value })} /></label>
    </div>
    <div className="flex flex-wrap items-center gap-inline">
      <Chip className={selected} pressed={end === 'forever'} onClick={() => onChange({ ...s, ends_on: null, max_times: null })}>{t('forever')}</Chip>
      <Chip className={selected} pressed={end === 'date'} onClick={() => onChange({ ...s, ends_on: s.ends_on ?? s.starts_on, max_times: null })}>{t('until')}</Chip>
      <Chip className={selected} pressed={end === 'count'} onClick={() => onChange({ ...s, ends_on: null, max_times: s.max_times ?? 2 })}>{t('times')}</Chip>
      {end === 'date' && <input aria-label={t('until')} type="date" min={s.starts_on} required className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input} max-w-48` : `${input} max-w-48`} value={s.ends_on ?? ''} onChange={e => onChange({ ...s, ends_on: e.target.value })} />}
      {end === 'count' && <NumberInput aria-label={t('times')} min={1} max={10000} required className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input} max-w-24` : `${input} max-w-24`} value={s.max_times ?? ''} onCommit={value => onChange({ ...s, max_times: value })} />}
    </div>
    <h2 className="mb-stack mt-card-gap font-display text-title font-semibold">{t('unanswered')}</h2>
    <div className="flex flex-wrap gap-inline">{([null, 12, 24] as const).map(hours => <Chip className={selected} key={String(hours)} pressed={s.remind_after_hours === hours}
      onClick={() => onChange({ ...s, remind_after_hours: hours })}>{t(hours === null ? 'noReminder' : hours === 12 ? 'remind12' : 'remind24')}</Chip>)}</div>
  </>;
}

import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import type { FormDraft } from '../types';

export function ScheduleEditor({ form, locale, onChange }: { form: FormDraft; locale: Locale; onChange: (form: FormDraft) => void }) {
  const m = messages[locale], s = form.schedule, input = 'min-h-12 w-full rounded-control border border-line bg-surface px-3';
  return <fieldset className="glass mt-5 space-y-3 rounded-card p-4">
    <legend className="font-bold">{m.schedule}</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>{m.every}<select className={input} value={s?.every ?? ''} onChange={e => onChange({ ...form,
        schedule: e.target.value === 'week' ? { every: 'week', weekday: 5, hour: s?.hour ?? 9 }
          : e.target.value === 'month' ? { every: 'month', day: 1, hour: s?.hour ?? 9 } : null })}>
        <option value="">{m.noSchedule}</option><option value="week">{m.week}</option><option value="month">{m.month}</option>
      </select></label>
      {s && <>
        <label>{m.day}{s.every === 'week' ? <select className={input} value={s.weekday} onChange={e => onChange({ ...form, schedule: { ...s, weekday: Number(e.target.value) } })}>
          {m.weekdays.map((day, i) => <option key={day} value={i}>{day}</option>)}
        </select> : <input className={input} type="number" min={1} max={31} value={s.day} onChange={e => onChange({ ...form, schedule: { ...s, day: e.target.valueAsNumber } })} />}</label>
        <label>{m.hour}<input className={input} type="number" min={0} max={23} value={s.hour} onChange={e => onChange({ ...form, schedule: { ...s, hour: e.target.valueAsNumber } })} /></label>
      </>}
      <label>{m.reminder}<input className={input} type="number" min={1} max={32767} placeholder={m.noReminder} value={form.remind_after_hours ?? ''}
        onChange={e => onChange({ ...form, remind_after_hours: e.target.value === '' ? null : e.target.valueAsNumber })} /></label>
    </div>
  </fieldset>;
}

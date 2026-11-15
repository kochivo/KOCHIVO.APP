import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { assessmentTime, assessmentWeekday, recurrenceLabel } from '../assessment-summary';
import { messages as redesign } from '../redesign/messages';
import { LibrarySchedulesEntry } from './library-schedules-entry';
import { Button } from '@/ui/button';

export function V11FormSettings(props: ComponentProps<typeof LibrarySchedulesEntry> & { schedule: string }) {
  const { form, locale, style, scheduleContext } = props;
  const [editing, setEditing] = useState(false);
  const t = createT(workspaceMessages, locale, style), r = createT(redesign, locale, style), m = formCopy(locale, style);
  const schedules = scheduleContext?.schedules ?? [];
  const timing = form.schedule ? `${form.schedule.every === 'week' ? r('weeklyDay', { day: assessmentWeekday(form.schedule.weekday, locale) }) : r('monthlyDay', { n: form.schedule.day })} · ${assessmentTime({ hour: form.schedule.hour, minute: 0 }, locale)}` : '';
  const summary = form.schedule ? t('scheduledSummary', { schedule: timing, audience: t('allRecipients') })
    : schedules.length ? schedules.map(s => {
      const audience = s.player_id ? r('forPlayer', { name: scheduleContext?.players.find(p => p.id === s.player_id)?.name ?? '' }) : t('allRecipients');
      const line = t('scheduledSummary', { schedule: `${recurrenceLabel(s, locale)} · ${assessmentTime(s, locale)}`, audience });
      return s.paused_at ? t('pausedSummary', { schedule: line }) : line;
    }).join(' · ') : t('manualSummary');
  const reminders = [form.remind_after_hours, ...schedules.map(s => s.remind_after_hours)].filter((hours): hours is number => Boolean(hours));
  return <section className="glass rounded-card border border-line-soft p-4"><h2 className="mb-3 text-sm font-semibold">{t('settings')}</h2>
    <p className="text-sm text-muted">{summary}{reminders.length > 0 && ` · ${reminders.map(n => r('remindHours', { n })).join(' · ')}`}</p>
    <Button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)} variant={'secondary'} block={false} className={"press mt-3 flex min-h-12 cursor-pointer items-center gap-2 px-4 text-sm focus-visible:ring-2 focus-visible:ring-lime"}>{t('editSettings')}<ChevronDown aria-hidden className={`size-4 transition-transform ${editing ? 'rotate-180' : ''}`} /></Button>
    {editing && <div className="mt-3">
      <label className="mb-3 block text-xs text-muted">{m.formTitle}<input value={form.title} onChange={e => props.onChange({ ...form, title: e.target.value })} className="mt-2 min-h-12 w-full rounded-control border border-line bg-transparent px-3 text-sm text-ink" /></label>
      <label className="flex min-h-12 items-center justify-between gap-3 text-xs text-muted">{t('kind')}<select value={form.kind} onChange={e => props.onChange({ ...form, kind: e.target.value as typeof form.kind })} className="min-h-12 max-w-full rounded-control bg-surface px-3 text-ink">
        {Object.entries(m.kinds).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}<option value="custom">{t('manual')}</option></select></label>
      <LibrarySchedulesEntry {...props} />
    </div>}
  </section>;
}

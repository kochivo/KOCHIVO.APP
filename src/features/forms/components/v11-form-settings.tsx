import { editableFieldClass } from '@/ui/edit-in-place';
import type { ComponentProps } from 'react';
import { useId, useState } from 'react';
import { Bell, Pencil } from 'lucide-react';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { editorButton } from './v11-question-controls';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { assessmentTime, assessmentWeekday, recurrenceLabel } from '../assessment-summary';
import { messages as redesign } from '../redesign/messages';
import { LibrarySchedulesEntry } from './library-schedules-entry';
import { Button } from '@/ui/button';

export function V11FormSettings(props: ComponentProps<typeof LibrarySchedulesEntry>) {
  const { form, locale, style, scheduleContext } = props;
  const [editing, setEditing] = useState(false), id = useId();
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
  return <section id={id} tabIndex={-1} className="glass flex items-center gap-stack rounded-control border border-line-soft px-stack py-inline">
    <Bell aria-hidden className="size-5 shrink-0 text-muted" />
    <p className="min-w-0 flex-1 text-sm text-muted">{summary}{reminders.length > 0 && <small className="block">{reminders.map(n => r('remindHours', { n })).join(' · ')}</small>}</p>
    <button type="button" aria-haspopup="dialog" onClick={() => setEditing(true)} className={editorButton}><Pencil aria-hidden className="size-4" />{t('editSettings')}</button>
    {editing && <ResponsiveDialog modal fallbackId={id} title={t('settings')} onDismiss={() => setEditing(false)} onClose={() => setEditing(false)}
      className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl rounded-card border border-line p-card text-ink"
      footer={<Button onClick={() => setEditing(false)} block={false} className="px-page-x">{m.close}</Button>}>
      <div className="[&_button]:cursor-pointer [&_button]:active:scale-[.98] [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-lime [&_summary]:cursor-pointer [&_summary]:active:scale-[.98] [&_summary:focus-visible]:ring-2 [&_summary:focus-visible]:ring-lime">
      <label className="mb-stack block text-xs text-muted">{m.formTitle}<input value={form.title} onChange={e => props.onChange({ ...form, title: e.target.value })} className={`${editableFieldClass} mt-inline min-h-12 w-full rounded-control border border-line bg-surface px-stack text-sm text-ink`} /></label>
      <label className="flex min-h-12 items-center justify-between gap-stack text-xs text-muted">{t('kind')}<select value={form.kind} onChange={e => props.onChange({ ...form, kind: e.target.value as typeof form.kind })} className={`${editableFieldClass} min-h-12 max-w-full rounded-control bg-surface px-stack text-ink`}>
        {Object.entries(m.kinds).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}<option value="custom">{t('manual')}</option></select></label>
      <LibrarySchedulesEntry {...props} />
      </div>
    </ResponsiveDialog>}
  </section>;
}

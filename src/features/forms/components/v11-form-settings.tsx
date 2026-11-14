import type { ComponentProps } from 'react';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { assessmentTime, recurrenceLabel } from '../assessment-summary';
import { messages as redesign } from '../redesign/messages';
import { LibrarySchedulesEntry } from './library-schedules-entry';

export function V11FormSettings(props: ComponentProps<typeof LibrarySchedulesEntry> & { schedule: string }) {
  const { form, locale, style, scheduleContext, schedule } = props;
  const t = createT(workspaceMessages, locale, style), r = createT(redesign, locale, style), m = formCopy(locale, style);
  const schedules = scheduleContext?.schedules ?? [];
  const audience = form.schedule ? r('all') : schedules.length ? schedules.map(s => s.player_id
    ? r('forPlayer', { name: scheduleContext?.players.find(p => p.id === s.player_id)?.name ?? '' }) : r('all')).join(' · ') : t('manual');
  const rows = [[t('kind'), form.kind === 'custom' ? t('manual') : m.kinds[form.kind]],
    [t('sends'), form.schedule ? schedule : schedules.length ? schedules.map(s => `${recurrenceLabel(s, locale)} · ${assessmentTime(s, locale)}`).join(' · ') : t('manual')],
    ...(form.remind_after_hours ? [[t('reminder'), r('remindHours', { n: form.remind_after_hours })]]
      : schedules.filter(s => s.remind_after_hours).map(s => [t('reminder'), r('remindHours', { n: s.remind_after_hours ?? 0 })])),
    [t('to'), audience]];
  return <section className="glass rounded-card border border-line-soft p-4"><h2 className="mb-3 text-sm font-semibold">{t('settings')}</h2>
    <dl>{rows.map(([label, value], n) => <div key={n} className="flex min-h-12 items-center justify-between gap-3 border-b border-line-soft py-2 text-xs"><dt className="shrink-0 text-muted">{label}</dt><dd className="text-end font-semibold">{value}</dd></div>)}</dl>
    <details><summary className="min-h-12 cursor-pointer py-3 text-xs text-muted">{m.edit}</summary>
      <label className="mb-3 block text-xs text-muted">{m.formTitle}<input value={form.title} onChange={e => props.onChange({ ...form, title: e.target.value })} className="mt-2 min-h-12 w-full rounded-control border border-line bg-transparent px-3 text-sm text-ink" /></label>
      <label className="flex min-h-12 items-center justify-between gap-3 text-xs text-muted">{t('kind')}<select value={form.kind} onChange={e => props.onChange({ ...form, kind: e.target.value as typeof form.kind })} className="min-h-12 max-w-full rounded-control bg-surface px-3 text-ink">
        {Object.entries(m.kinds).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}<option value="custom">{t('manual')}</option></select></label>
      <LibrarySchedulesEntry {...props} />
    </details>
  </section>;
}

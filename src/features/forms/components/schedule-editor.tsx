import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { rowLinkClass } from '@/ui/row-link';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import { editableFieldClass } from '@/ui/edit-in-place';
import { Button } from '@/ui/button';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formCopy } from '../form-copy';
import { messages as redesign } from '../redesign/messages';
import type { FormDraft } from '../types';
import type { ScheduleContext } from '../schedule-context';
import { recurrenceLabel } from '../assessment-summary';
import { ThemedSelect } from './themed-select';

export function ScheduleEditor({ form, locale, onChange, players = 0, style, scheduleContext, canManage = true, onManage }: {
  form: FormDraft; locale: Locale; onChange: (form: FormDraft) => void; players?: number; style?: ArabicStyle;
  scheduleContext?: ScheduleContext; canManage?: boolean;
  onManage?: () => void;
}) {
  const m = formCopy(locale, style), t = createT(redesign, locale, style), s = form.schedule;
  const workspace = captainWorkspaceEnabled();
  function manage() {
    if (canManage) onManage?.();
  }
  if (!s && scheduleContext?.schedules.length) return <div className="glass mb-card-gap rounded-card border border-line-soft px-page-x py-page-y">
    {scheduleContext.schedules.map(schedule => <p key={schedule.id} className="text-sm leading-[2.2] text-muted">
      {t('sends')} {recurrenceLabel(schedule, locale)} · {schedule.player_id
        ? t('forPlayer', { name: scheduleContext.players.find(p => p.id === schedule.player_id)?.name ?? '' }) : t('all')}
      {schedule.paused_at && <> · {t('stopped')}</>}
    </p>)}
    <Button variant="secondary" type="button" disabled={!canManage} className="min-h-12 text-sm text-ink disabled:opacity-50" onClick={manage}>{t('schedule')}</Button>
  </div>;
  const reminders = [{ value: '', label: t('noReminder') }, { value: '12', label: t('remind12') }, { value: '24', label: t('remind') }];
  if (form.remind_after_hours && ![12, 24].includes(form.remind_after_hours)) reminders.push({ value: String(form.remind_after_hours), label: t('remindHours', { n: form.remind_after_hours }) });
  return <div className="glass mb-card-gap rounded-card border border-line-soft px-page-x py-page-y">
    <div className="flex flex-wrap items-center gap-inline text-sm leading-[2.2]">
      <span>{t('sends')}</span><ThemedSelect label={m.every} value={s?.every ?? ''}
        options={[{ value: '', label: t('manual') }, { value: 'week', label: m.week }, { value: 'month', label: m.month },
          ...(canManage ? [{ value: 'advanced', label: t('schedule') }] : [])]}
        onChange={value => { if (value === 'advanced') { manage(); return; }
          onChange({ ...form, schedule: value === 'week' ? { every: 'week', weekday: 5, hour: s?.hour ?? 9 }
            : value === 'month' ? { every: 'month', day: 1, hour: s?.hour ?? 9 } : null }); }} />
      {s && <><span>{t('day')}</span><ThemedSelect label={m.day} value={String(s.every === 'week' ? s.weekday : s.day)}
        options={s.every === 'week' ? m.weekdays.map((label, n) => ({ value: String(n), label }))
          : Array.from({ length: 31 }, (_, n) => ({ value: String(n + 1), label: String(n + 1) }))}
        onChange={value => onChange({ ...form, schedule: s.every === 'week' ? { ...s, weekday: Number(value) } : { ...s, day: Number(value) } })} /></>}
      <span>{t('to')}</span><ThemedSelect label={t('to')} value="all" disabled={!canManage} options={[{ value: 'all', label: `${t('all')} (${players})` }, { value: 'players', label: t('specificPlayers') }]}
        onChange={value => {
          if (value !== 'players') return;
          manage();
        }} />
      <span>{t('unanswered')}</span><ThemedSelect label={m.reminder} value={String(form.remind_after_hours ?? '')} options={reminders}
        onChange={value => onChange({ ...form, remind_after_hours: value ? Number(value) : null })} />
    </div>
    <Button variant="secondary" type="button" disabled={!canManage} className="min-h-12 text-xs text-faint disabled:opacity-50" onClick={manage}>{t('schedule')}</Button>
    {s && <details className={workspace ? 'group mt-inline text-xs text-muted' : 'mt-inline text-xs text-faint'}>
      <summary className={workspace ? `${rowLinkClass} flex list-none items-center justify-between gap-inline py-stack text-ink` : 'min-h-12 cursor-pointer py-stack'}>{t('details')}{workspace && <DisclosureChevron />}</summary>
      <label className="flex flex-wrap items-center gap-stack">{m.hour}<input aria-label={m.hour} className={workspace ? `${editableFieldClass} min-h-12 w-24 rounded-control border border-line bg-surface px-stack` : 'min-h-12 w-24 rounded-control border border-line bg-transparent px-stack'}
        type="number" min={0} max={23} value={s.hour} onChange={e => onChange({ ...form, schedule: { ...s, hour: e.target.valueAsNumber } })} /></label>
    </details>}
  </div>;
}

import { KoSend } from '@/ui/icons/ko-send';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Ellipsis, Send } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { FactRow } from '@/ui/fact-row';
import { Button } from '@/ui/button';
import { DEFAULT_TIMEZONE, formatDateAr, localDate } from '@/lib/dates';
import type { AssessmentSchedule } from '@/types/assessment-schedules';
import type { AssessmentWorkspaceData } from '../data/assessment-workspace';
import { nextAssessmentDate } from '../assessment-recurrence';
import { recurrenceLabel } from '../assessment-summary';
import { messages } from '../assessments/messages';

export function AssessmentPanel({ data, player, locale, now, busy, onEdit, onPause, onDelete, onSend }: {
  data: AssessmentWorkspaceData; player?: string; locale: Locale; now: Date; busy: boolean;
  onEdit: (s: AssessmentSchedule) => void; onPause: (s: AssessmentSchedule) => void;
  onDelete: (s: AssessmentSchedule) => void; onSend: () => void;
}) {
  const SendIcon = captainWorkspaceEnabled() ? KoSend : Send;
  const t = createT(messages, locale), person = data.players.find(p => p.id === player);
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long' }, locale);
  return <aside className="glass-strong min-w-0 rounded-card border border-line-soft px-5 py-[18px] min-[1001px]:sticky min-[1001px]:top-4">
    <h2 className="mb-3 font-display text-[19px] font-semibold">{person ? t('playerAssessments', { name: person.name }) : t('schedules')}</h2>
    {!data.schedules.length && !data.forms.some(f => f.schedule) && <p className="py-3 text-xs text-faint">{t('noSchedules')}</p>}
    {data.schedules.map(s => {
      const title = data.forms.find(f => f.id === s.form_id)?.title ?? '';
      const recipient = data.players.find(p => p.id === (player ?? s.player_id));
      const recipients = recipient ? [recipient] : data.players;
      const next = recipients.flatMap(p => {
        const sent = data.counts.find(c => c.schedule_id === s.id && c.player_id === p.id)?.sends ?? 0;
        const date = nextAssessmentDate(s, now, p.timezone, p.joined, sent);
        return date ? [date] : [];
      }).sort()[0];
      const last = data.answers.find(a => a.form_id === s.form_id && (!recipient || a.player_id === recipient.id));
      const status = s.paused_at ? t('paused') : next ? t('next', { date: date(next) }) : last?.answered_at
        ? t('lastAnswer', { date: date(localDate(new Date(last.answered_at), recipient?.timezone ?? DEFAULT_TIMEZONE)) }) : t('ended');
      return <div key={s.id} className="border-b border-line-soft py-2 last:border-0">
        <div className="flex items-center gap-1"><dl className="min-w-0 flex-1"><FactRow label={title}><span className={s.paused_at ? 'text-faint' : 'text-lime'}>{status}</span></FactRow></dl>
          <details className="relative"><summary aria-label={t('edit')} className="flex min-h-12 min-w-12 cursor-pointer list-none items-center justify-center"><Ellipsis aria-hidden className="size-4" /></summary>
            <div className="glass-strong absolute end-0 z-10 min-w-40 rounded-card border border-line-soft p-2">
              <Button variant="ghost" disabled={busy} onClick={() => onEdit(s)} className="min-h-12 w-full text-xs">{t('edit')}</Button>
              <Button variant="ghost" disabled={busy} onClick={() => onPause(s)} className="min-h-12 w-full text-xs">{t(s.paused_at ? 'resume' : 'pause')}</Button>
              <Button variant="ghost" disabled={busy} onClick={() => onDelete(s)} className="min-h-12 w-full text-xs">{t('delete')}</Button>
            </div>
          </details>
        </div>
        <p className="text-xs text-faint">{recurrenceLabel(s, locale)} · {s.player_id ? recipient?.name : t('all')}</p>
      </div>;
    })}
    <dl>{data.forms.filter(f => f.schedule || !data.schedules.some(s => s.form_id === f.id)).map(f => {
      const last = data.answers.find(a => a.form_id === f.id && (!player || a.player_id === player));
      if (f.schedule) {
        const legacy = f.schedule;
        const next = nextAssessmentDate({ kind: legacy.every, every_days: null, weekday: legacy.every === 'week' ? legacy.weekday : null,
          day: legacy.every === 'month' ? legacy.day : null, hour: legacy.hour, minute: 0, starts_on: localDate(now, DEFAULT_TIMEZONE),
          ends_on: null, max_times: null, paused_at: null }, now, DEFAULT_TIMEZONE);
        return <FactRow key={f.id} label={f.title}><span className="text-xs text-faint">{next && t('next', { date: date(next) })}<br />{t('legacyAll')}</span></FactRow>;
      }
      return last?.answered_at ? <FactRow key={f.id} label={f.title}><span className="text-faint">{t('lastAnswer', { date: date(localDate(new Date(last.answered_at), person?.timezone ?? DEFAULT_TIMEZONE)) })}</span></FactRow> : null;
    })}</dl>
    {player && <Button variant="secondary" onClick={onSend} className="mt-3 min-h-12 w-full rounded-full"><SendIcon aria-hidden className="size-4" />{t('send')}</Button>}
  </aside>;
}

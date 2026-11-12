'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { CalendarDays, Check, Plus } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { Chip } from '@/ui/chip';
import { Button } from '@/ui/button';
import { SaveStatus } from '@/ui/save-status';
import { uuidv7 } from '@/core/offline/ids';
import { DEFAULT_TIMEZONE, localDate } from '@/lib/dates';
import type { AssessmentSchedule } from '@/types/assessment-schedules';
import { assessmentInput } from '../assessment-schema';
import type { AssessmentInput } from '../assessment-schema';
import type { AssessmentWorkspaceData } from '../data/assessment-workspace';
import { assessmentSummary } from '../assessment-summary';
import { messages } from '../assessments/messages';
import { AssessmentFields } from './assessment-fields';

export function AssessmentEditor({ data, player, formId, initial, locale, onSave, onSaved, onCancel, now }: {
  data: AssessmentWorkspaceData; player?: string; formId?: string; initial?: AssessmentSchedule; locale: Locale;
  onSave: (s: AssessmentInput) => Promise<boolean>; onSaved: () => void; onCancel: () => void; now: Date;
}) {
  const t = createT(messages, locale);
  const [s, set] = useState<AssessmentInput>(() => initial ?? ({ id: uuidv7(), form_id: formId ?? data.forms[0]?.id ?? '',
    player_id: player ?? null, kind: 'week', every_days: null, weekday: 5, day: null, hour: 10, minute: 0,
    starts_on: localDate(now, data.players.find(p => p.id === player)?.timezone ?? DEFAULT_TIMEZONE), ends_on: null,
    max_times: null, remind_after_hours: 12, paused_at: null }));
  const [status, setStatus] = useState<'ready' | 'saving' | 'saved' | 'error'>('ready');
  const busy = useRef(false);
  const selected = data.players.find(p => p.id === s.player_id);
  const form = data.forms.find(f => f.id === s.form_id);
  const valid = assessmentInput.safeParse(s).success;
  async function save() {
    if (busy.current || !valid) return;
    busy.current = true; setStatus('saving');
    try { if (!await onSave(s)) throw new Error('Schedule save failed'); setStatus('saved'); onSaved(); }
    catch { setStatus('error'); }
    finally { busy.current = false; }
  }
  return <form className="glass min-w-0 rounded-card border border-line-soft px-5 py-[18px]" onSubmit={e => { e.preventDefault(); void save(); }}>
    <fieldset disabled={status === 'saving'}>
      <h2 className="mb-3 font-display text-[19px] font-semibold">{t('which')}</h2>
      <div className="flex flex-wrap gap-2">{data.forms.map(f => <Chip key={f.id} pressed={s.form_id === f.id}
        className="aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg-deep" onClick={() => set({ ...s, form_id: f.id })}>{f.title}</Chip>)}
        <Link prefetch={false} href={`/${locale}/captain/library/forms?template=checkin`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-soft px-4"><Plus aria-hidden className="size-4" />{t('new')}</Link>
      </div>
      {!data.forms.length && <p className="py-3 text-faint">{t('empty')}</p>}
      {!player && <label className="mt-4 block text-xs text-muted">{t('target')}
        <select className="ms-3 min-h-12 max-w-full rounded-control bg-surface px-3" value={s.player_id ?? ''} onChange={e => set({ ...s, player_id: e.target.value || null })}>
          <option value="">{t('all')}</option>{data.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <AssessmentFields value={s} onChange={set} locale={locale} allowOnJoin={s.player_id === null || s.kind === 'on_join'} />
      <p className="mt-3 text-xs text-faint">{selected ? t('timezone', { zone: selected.timezone }) : t('allTime')}</p>
      {valid && form && <p className="mt-4 flex items-center gap-3 rounded-card bg-lime-soft p-5 text-sm leading-7">
        <CalendarDays aria-hidden className="size-5 shrink-0 text-lime" />{assessmentSummary(s, selected?.name ?? null, form.title, locale, selected?.joined)}</p>}
      {!valid && <p role="status" className="mt-4 text-sm text-muted">{t('invalid')}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!valid} className="min-h-12 rounded-full"><Check aria-hidden className="size-4" />{t('schedule')}</Button>
        <Button type="button" variant="secondary" className="min-h-12 rounded-full" onClick={onCancel}>{t('cancel')}</Button>
        {status !== 'ready' && <SaveStatus locale={locale} status={status === 'saving' ? 'saving' : status === 'saved' ? 'saved' : 'error'} onRetry={() => void save()} />}
      </div>
    </fieldset>
  </form>;
}

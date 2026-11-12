'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { SaveStatus } from '@/ui/save-status';
import { activateProgram, addDay, renameDay, startTraining, useTrainingAutosave, validateForActivation, programMessages } from '@/features/programs';
import type { ProgramDraft } from '@/features/programs';
import { StartChoice } from './start-choice';
import { DayExercises } from './day-exercises';
import { messages } from './messages';

export function TrainingEditor({ playerId, initial, programs }: {
  playerId: string; initial: ProgramDraft | null; programs: { id: string; title: string; status: string }[];
}) {
  const t = useT(messages), pt = useT(programMessages), locale = useLocale();
  const state = useTrainingAutosave(initial);
  const [selected, setSelected] = useState(''), [choosing, setChoosing] = useState(!initial);
  const [templates, setTemplates] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const draft = state.draft;
  const day = draft?.days.find(row => row.id === selected) ?? draft?.days[0];
  const update = (operation: (current: ProgramDraft) => ProgramDraft) => {
    if (pending) return;
    setSent(false); state.update(operation);
  };
  async function start(templateId?: string) {
    if (pending) return;
    setPending(true); setError('');
    try {
      if (draft && !await state.flush()) return;
      const result = await startTraining(playerId, templateId);
      if (!result.data) { setError(result.error); return; }
      state.replace(result.data); setSelected(''); setChoosing(false); setSent(false);
    } catch { setError(t('error')); } finally { setPending(false); }
  }
  async function send() {
    if (!draft || pending) return;
    const errors = validateForActivation(draft, pt);
    setError(errors.join(' · '));
    if (errors.length) return;
    setPending(true);
    try {
      if (!await state.flush()) return;
      const result = await activateProgram(draft.id);
      if (!result.ok) setError(result.error);
      else { state.replace({ ...draft, status: 'active' }); setSent(true); }
    } catch { setError(t('error')); } finally { setPending(false); }
  }
  return <section className="@container min-w-0 space-y-[18px]">
    <header className="flex flex-wrap items-center justify-end gap-3">
      <SaveStatus status={state.status} locale={locale} onRetry={() => void state.flush()} />
      {draft && !choosing && <button disabled={pending} className="min-h-12 text-xs text-muted" onClick={() => { setChoosing(true); setTemplates(false); }}>{t('newProgram')}</button>}
      <Button className="min-h-12 w-auto! rounded-full!" disabled={!draft || pending || choosing} onClick={() => void send()}><Send aria-hidden className="size-4" />{t('send')}</Button>
    </header>
    {(error || state.error) && <p role="alert" className="text-sm text-danger">{error || state.error}</p>}
    {sent && <p role="status" className="text-xs text-faint">{t('sent')}</p>}
    {pending && <p role="status" className="text-xs text-faint">{t('loading')}</p>}
    {choosing ? <><StartChoice templates={templates} onTemplates={() => setTemplates(value => !value)} onStart={id => void start(id)} busy={pending} />
      {draft && <button disabled={pending} className="min-h-12 text-xs text-muted" onClick={() => setChoosing(false)}>{t('cancel')}</button>}</> :
      draft && <fieldset disabled={pending} className="min-w-0 space-y-3.5">
        <div className="flex flex-wrap gap-2">
          {draft.days.map((item, index) => <Chip key={item.id} pressed={item.id === day?.id}
            title={t('rename')} className={item.id === day?.id ? 'border-ink! bg-ink! text-bg-deep!' : 'border-line-soft bg-transparent text-muted'}
            onClick={() => { setRenaming(item.id === day?.id ? !renaming : false); setSelected(item.id); }}>{t('dayChip', { number: new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-GB').format(index + 1), title: item.title || pt(item.is_rest_day ? 'restStatus' : 'newDay') })}</Chip>)}
          <Chip pressed={false} disabled={draft.days.some(row => row.weekday != null)} title={draft.days.some(row => row.weekday != null) ? t('fixedWeek') : undefined} className="inline-flex items-center gap-1 border-line-soft bg-transparent" onClick={() => {
            const id = uuidv7(); update(current => addDay(current, id, t('day'))); setSelected(id);
          }}><Plus aria-hidden className="size-4" />{t('day')}</Chip>
        </div>
        {draft.days.some(row => row.weekday != null) && <p className="text-xs text-faint">{t('fixedWeek')}</p>}
        {day ? <>
          {renaming && <input autoFocus aria-label={t('rename')} value={day.title} maxLength={60} className="min-h-12 w-full bg-transparent font-display text-[19px] font-semibold"
            onBlur={() => setRenaming(false)} onKeyDown={event => { if (event.key === 'Enter' || event.key === 'Escape') setRenaming(false); }}
            onChange={event => update(current => renameDay(current, day.id, event.target.value))} />}
          <DayExercises key={day.id} day={day} update={update} />
        </> : <p className="glass rounded-card p-5 text-faint">{t('noDays')}</p>}
        <Link className="inline-flex min-h-12 items-center text-xs text-muted" href={`/captain/programs/${draft.id}`}>{t('advanced')}</Link>
        <label className="flex flex-wrap items-center gap-3 text-xs text-muted">{t('programName')}
          <input value={draft.title} maxLength={80} className="min-h-12 min-w-0 flex-1 bg-transparent text-sm text-ink"
            onChange={event => update(current => ({ ...current, title: event.target.value }))} />
        </label>
      </fieldset>}
    <details className="glass rounded-card border border-line-soft px-5 py-2">
      <summary className="flex min-h-12 cursor-pointer items-center text-xs text-muted">{t('history')}</summary>
      {programs.length ? programs.map(row => <Link key={row.id} href={`/captain/programs/${row.id}`} className="flex min-h-12 items-center justify-between gap-3 border-t border-line-soft text-sm">
        <span>{row.title}</span><span className="text-faint">{pt(row.status === 'active' ? 'active' : row.status === 'archived' ? 'archived' : 'draft')}</span>
      </Link>) : <p className="py-3 text-faint">{t('emptyPrograms')}</p>}
    </details>
  </section>;
}

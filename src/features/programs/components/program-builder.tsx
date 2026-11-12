'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { uuidv7 } from '@/core/offline/ids';
import { Button, EmptyState, ErrorState, LoadingState, TextField } from '@/ui';
import { validateForActivation } from '../summary';
import { createProgram, listPlayerPrograms } from '../data/program-io';
import { activateProgram } from '../data/activate';
import { useProgramDraft } from '../hooks/use-program-draft';
import type { ProgramRow, Result } from '../types';
import { BuilderHeader } from './builder-header';
import { DayEditor } from './day-editor';
import { starterText } from '@/lib/starter-text';
import { useToast } from '@/ui/toast';
import { convertToWeek, isWeekly } from '../weekly-draft';
import { BuilderNavigation } from './builder-navigation';

export function ProgramBuilder({ programId, playerId }: { programId?: string; playerId?: string }) {
  const t = useT(messages);
  const toast = useToast();
  const locale = useLocale();
  const state = useProgramDraft(programId);
  const [selectedDay, setSelectedDay] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState('');
  const [programs, setPrograms] = useState<Result<ProgramRow[]> | null>(null);
  const [revision, setRevision] = useState(0);
  const [loadedRevision, setLoadedRevision] = useState(-1);
  const router = useRouter();
  useEffect(() => {
    if (!playerId) return;
    let current = true;
    listPlayerPrograms(playerId).then(result => {
      if (current) { setPrograms(result); setLoadedRevision(revision); }
    }).catch(() => { if (current) { setPrograms({ error: t('couldntLoadProgramsTryAgain') }); setLoadedRevision(revision); } });
    return () => { current = false; };
  }, [playerId, revision, t]);
  async function create() {
    if (!playerId || pending) return;
    setPending(true); setMessage('');
    try {
      const result = await createProgram(playerId, title);
      if (result.error) setMessage(result.error);
      else if (result.data) router.push(`/captain/programs/${result.data}`);
    } catch { setMessage(t('couldntCreateTheProgramTryAgain')); }
    finally { setPending(false); }
  }
  async function save() {
    setMessage('');
    await state.save();
  }
  async function activate() {
    if (!state.draft || pending || state.saving) return;
    const errors = validateForActivation(state.draft, t);
    setMessage(errors.join(' · '));
    if (errors.length) return;
    setPending(true);
    try {
      if (!await state.save()) return;
      const result = await activateProgram(state.draft.id);
      if (!result.ok) setMessage(result.error);
      else { state.activated(); toast.success(t('programActivatedForPlayer')); }
    } catch { setMessage(t('couldntActivateTryAgain')); }
    finally { setPending(false); }
  }
  if (playerId) return <div className="mx-auto max-w-5xl space-y-6">
    <h1 className="text-3xl font-extrabold">{t('programs')}</h1>
    <form className="glass grid gap-4 rounded-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={event => { event.preventDefault(); void create(); }}>
      <TextField label={t('newProgramName')} value={title} maxLength={80} required disabled={pending} onChange={event => setTitle(event.target.value)} />
      <Button type="submit" variant={programs?.data?.length === 0 ? 'secondary' : 'primary'} className="min-h-12" disabled={pending}>{t('newProgram')}</Button>
      {pending && <p role="status" className="sm:col-span-2">{t('creatingProgram')}</p>}
      {message && <p role="alert" className="text-danger sm:col-span-2">{message}</p>}
    </form>
    {programs === null || loadedRevision !== revision ? <LoadingState /> : programs.error ?
      <ErrorState message={programs.error} retryLabel={t('tryAgain')} onRetry={() => setRevision(value => value + 1)} /> : <>
        {programs.data?.length === 0 && <EmptyState icon={Dumbbell} title={t('noProgramsForThisPlayerYet')} body={t('emptyBody')} action={{ label: t('orStartFromTemplate'), href: '/captain/templates' }} />}
        <ul className="grid gap-3 lg:grid-cols-2">{programs.data?.map(program => <li key={program.id}>
          <Link className="glass flex min-h-16 items-center justify-between gap-4 rounded-control p-4" href={`/captain/programs/${program.id}`}>
            <span className="min-w-0 break-words font-bold">{starterText(program.title, locale)}</span>
            <span className="shrink-0 text-sm text-muted">{{ active: t('active'), draft: t('draft'), archived: t('archived') }[program.status]}</span>
          </Link>
        </li>)}</ul>
      </>}
  </div>;
  if (state.loading) return <div><LoadingState variant="detail" /></div>;
  if (!state.draft) return <div><ErrorState message={state.error || t('programNotFound')} retryLabel={t('tryAgain')} onRetry={state.retry} /></div>;
  const draft = state.draft;
  const day = draft.days.find(item => item.id === selectedDay) ?? draft.days[0];
  const busy = pending || state.saving;
  const weekly = isWeekly(draft);
  return <div className="mx-auto max-w-screen-2xl space-y-6 pb-[var(--builder-action-height)] lg:pb-0">
    <fieldset disabled={busy} className="min-w-0 space-y-6">
      <BuilderHeader draft={draft} dirty={state.dirty} busy={busy} onTitle={value => state.update(current => ({ ...current, title: value }))}
        onSave={() => void save()} onActivate={() => void activate()} />
      {weekly ? <label className="flex min-h-12 items-center gap-3">
        <input type="checkbox" className="size-6 accent-lime" checked={draft.repeatWeekly !== false}
          onChange={event => state.update(current => ({ ...current, repeatWeekly: event.target.checked }))} />{t('repeatWeekly')}
      </label> : <div className="glass space-y-3 rounded-card p-4">
        <p className="text-sm text-muted">{t('rotationNotice')}</p>
        <Button variant="secondary" className="min-h-12" disabled={draft.days.length > 7}
          onClick={() => state.update(current => convertToWeek(current, uuidv7))}>{t('convertWeek')}</Button>
        {draft.days.length > 7 && <p className="text-sm text-muted">{t('convertLimit')}</p>}
      </div>}
      {busy && <p role="status" className="text-muted">{t('savingAndUpdating')}</p>}
      {(message || state.error) && <div role="alert" className="text-danger"><p>{message || state.error}</p>
        <Button variant="ghost" className="min-h-12" onClick={() => void (message ? activate() : save())}>{t('tryAgain')}</Button>
      </div>}
      <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <BuilderNavigation draft={draft} selectedId={day?.id} onSelect={setSelectedDay} update={state.update} />
        <div className="min-w-0 space-y-4">
          {!draft.days.some(item => item.exercises.length > 0) && <p className="glass rounded-control p-4 text-sm text-muted">
            {t('firstSteps', { one: formatNumber(1, locale), two: formatNumber(2, locale), three: formatNumber(3, locale) })}
          </p>}
          {day && <DayEditor key={day.id} day={day} update={state.update} first={day.id === draft.days[0]?.id}
            last={day.id === draft.days.at(-1)?.id} usedExerciseIds={draft.days.flatMap(item => item.exercises.map(row => row.exercise_id))} />}
        </div>
      </div>
    </fieldset>
  </div>;
}

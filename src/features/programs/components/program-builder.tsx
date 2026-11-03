'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { uuidv7 } from '@/core/offline/ids';
import { Button, ErrorState, IconButton, LoadingState, TextField } from '@/ui';
import { addDay, addExercise, moveDay, removeDay } from '../draft';
import { validateForActivation } from '../summary';
import { createProgram, listPlayerPrograms } from '../data/program-io';
import { activateProgram } from '../data/activate';
import { useProgramDraft } from '../hooks/use-program-draft';
import type { ProgramRow, Result } from '../types';
import { BuilderHeader } from './builder-header';
import { DayEditor } from './day-editor';
import { ExercisePicker } from './exercise-picker';

export function ProgramBuilder({ programId, playerId }: { programId?: string; playerId?: string }) {
  const state = useProgramDraft(programId);
  const [selectedDay, setSelectedDay] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
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
    }).catch(() => { if (current) { setPrograms({ error: 'البرامج متحمّلتش. جرّب تاني' }); setLoadedRevision(revision); } });
    return () => { current = false; };
  }, [playerId, revision]);
  async function create() {
    if (!playerId || pending) return;
    setPending(true); setMessage('');
    try {
      const result = await createProgram(playerId, title);
      if (result.error) setMessage(result.error);
      else if (result.data) router.push(`/captain/programs/${result.data}`);
    } catch { setMessage('البرنامج متعملش. جرّب تاني'); }
    finally { setPending(false); }
  }
  async function save() {
    setNotice(''); setMessage('');
    if (await state.save()) setNotice('اتحفظ');
  }
  async function activate() {
    if (!state.draft || pending || state.saving) return;
    setNotice('');
    const errors = validateForActivation(state.draft);
    setMessage(errors.join(' · '));
    if (errors.length) return;
    setPending(true);
    try {
      if (!await state.save()) return;
      const result = await activateProgram(state.draft.id);
      if (result.error) setMessage(result.error);
      else { state.activated(); setNotice('البرنامج اتفعّل للاعب'); }
    } catch { setMessage('التفعيل متعملش. جرّب تاني'); }
    finally { setPending(false); }
  }
  if (playerId) return <div className="mx-auto max-w-5xl space-y-6">
    <h1 className="text-3xl font-extrabold">البرامج</h1>
    <form className="glass space-y-4 rounded-card p-5" onSubmit={event => { event.preventDefault(); void create(); }}>
      <TextField label="اسم البرنامج الجديد" value={title} maxLength={80} required disabled={pending} onChange={event => setTitle(event.target.value)} />
      <Button type="submit" className="min-h-12" disabled={pending}>برنامج جديد</Button>
      {pending && <p role="status">جاري إنشاء البرنامج</p>}
      {message && <p role="alert" className="text-danger">{message}</p>}
    </form>
    {programs === null || loadedRevision !== revision ? <LoadingState /> : programs.error ?
      <ErrorState message={programs.error} retryLabel="جرّب تاني" onRetry={() => setRevision(value => value + 1)} /> : <>
        {programs.data?.length === 0 && <p className="glass rounded-card p-6 text-muted">لسه مفيش برامج للاعب ده</p>}
        <ul className="space-y-3">{programs.data?.map(program => <li key={program.id}>
          <Link className="glass flex min-h-16 items-center justify-between gap-4 rounded-control p-4" href={`/captain/programs/${program.id}`}>
            <span className="break-words font-bold">{program.title}</span>
            <span className="shrink-0 text-sm text-muted">{{ active: 'نشط', draft: 'مسودة', archived: 'مؤرشف' }[program.status]}</span>
          </Link>
        </li>)}</ul>
      </>}
  </div>;
  if (state.loading) return <div><LoadingState /></div>;
  if (!state.draft) return <div><ErrorState message={state.error || 'البرنامج مش موجود'} retryLabel="جرّب تاني" onRetry={state.retry} /></div>;
  const draft = state.draft;
  const day = draft.days.find(item => item.id === selectedDay) ?? draft.days[0];
  const busy = pending || state.saving;
  return <div className="mx-auto max-w-screen-2xl space-y-6">
    <fieldset disabled={busy} className="min-w-0 space-y-6">
      <BuilderHeader draft={draft} dirty={state.dirty} busy={busy} onTitle={value => state.update(current => ({ ...current, title: value }))}
        onSave={() => void save()} onActivate={() => void activate()} />
      {busy && <p role="status" className="text-muted">جاري الحفظ والتحديث</p>}
      {(message || state.error) && <div role="alert" className="text-danger"><p>{message || state.error}</p>
        <Button variant="ghost" className="min-h-12" onClick={() => void (message ? activate() : save())}>جرّب تاني</Button>
      </div>}
      {notice && <p role="status" className="text-lime">{notice}</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="أيام البرنامج" className="glass space-y-3 rounded-card p-4">
          <h2 className="font-bold">أيام البرنامج</h2>
          {draft.days.length === 0 && <p className="text-sm text-muted">ضيف أول يوم</p>}
          <ul className="space-y-3">{draft.days.map((item, index) => <li key={item.id} className="space-y-2">
            <Button variant="ghost" aria-pressed={item.id === day?.id} className="min-h-12 w-full justify-start text-start" onClick={() => setSelectedDay(item.id)}>
              {item.position} · {item.title || 'يوم جديد'}
            </Button>
            <div className="flex gap-2">
              <IconButton aria-label={`طلّع اليوم لفوق: ${item.position}، ${item.title}`} disabled={index === 0} onClick={() => state.update(current => moveDay(current, item.id, -1))}><ArrowUp aria-hidden className="size-5" /></IconButton>
              <IconButton aria-label={`نزّل اليوم لتحت: ${item.position}، ${item.title}`} disabled={index === draft.days.length - 1} onClick={() => state.update(current => moveDay(current, item.id, 1))}><ArrowDown aria-hidden className="size-5" /></IconButton>
              <IconButton aria-label={`امسح اليوم: ${item.position}، ${item.title}`} onClick={() => state.update(current => removeDay(current, item.id))}><Trash2 aria-hidden className="size-5" /></IconButton>
            </div>
          </li>)}</ul>
          <Button variant="secondary" className="min-h-12 w-full" onClick={() => {
            const id = uuidv7(); state.update(current => addDay(current, id)); setSelectedDay(id);
          }}>ضيف يوم</Button>
        </aside>
        <div className="grid min-w-0 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_20rem]">
          {day && <DayEditor key={day.id} day={day} update={state.update} />}
          <ExercisePicker disabled={!day || busy} onAdd={exercise => {
            if (day) { const id = uuidv7(); state.update(current => addExercise(current, day.id, exercise, id)); }
          }} />
        </div>
      </div>
    </fieldset>
  </div>;
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { Button } from '@/ui/button';
import { useLocale, useT } from '@/core/i18n/client';
import { activateProgram, startTraining, useTrainingAutosave, validateForActivation, programMessages } from '@/features/programs';
import type { ProgramDraft } from '@/features/programs';
import { StartChoice } from './start-choice';
import { applyCustomExercise, DayExercises } from './day-exercises';
import { completeCustomExerciseReturn } from './custom-exercise';
import { uuidv7 } from '@/core/offline/ids';
import { messages } from './messages';
import { DayRail } from './day-rail';
import { DaySummary } from './day-summary';
import { WarmupBlock } from './warmup-block';
import { CardioBlock } from './cardio-block';
import { WeekMenu } from './week-menu';
import { EditorHeader } from './editor-header';
import { AssignmentSheet } from './assignment-sheet';
import { messages as editorMessages } from './editor/messages';
import { restDay } from './editor-draft';
import { TrainingFacts } from './training-facts';
import type { TrainingPlayerFacts } from './training-facts';

type Props = { programs: { id: string; title: string; status: string }[]; playerName?: string; remainingDays?: number; playerFacts?: TrainingPlayerFacts } & (
  { mode?: 'player'; playerId: string; initial: ProgramDraft | null } |
  { mode: 'template'; playerId?: never; initial: ProgramDraft }
);

export function TrainingEditor({ playerId, playerName, remainingDays, playerFacts, initial, programs, mode = 'player' }: Props) {
  const t = useT(messages), pt = useT(programMessages), et = useT(editorMessages);
  const locale = useLocale();
  const template = mode === 'template';
  const state = useTrainingAutosave(initial);
  const search = useSearchParams(), pathname = usePathname(), router = useRouter();
  const returnProgram = search.get('exerciseProgram') ?? '', returnDay = search.get('exerciseDay') ?? '';
  const returnId = search.get('customExercise') ?? '', returnMode = search.get('customExerciseMode') ?? '';
  const [selected, setSelected] = useState(returnProgram === initial?.id ? returnDay : ''), [choosing, setChoosing] = useState(!initial);
  const [templates, setTemplates] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [returnError, setReturnError] = useState('');
  const handlingReturn = useRef('');
  const draft = state.draft;
  const { update: updateDraft, flush: flushDraft } = state;
  const draftId = draft?.id;
  const acceptReturn = useCallback(async () => {
    const key = `${returnProgram}:${returnDay}:${returnId}:${returnMode}`;
    if (!returnId || draftId !== returnProgram || !returnDay || !['add', 'edit'].includes(returnMode) || handlingReturn.current === key) return;
    handlingReturn.current = key;
    setPending(true); setReturnError('');
    try {
      const saved = await completeCustomExerciseReturn(returnId, library => {
        // A read may finish after the captain has left this editor.
        if (window.location.pathname !== pathname || new URLSearchParams(window.location.search).get('customExercise') !== returnId) throw new Error('navigation');
        updateDraft(current => applyCustomExercise(current, returnProgram, returnDay, library, returnMode, uuidv7()));
      }, flushDraft);
      if (!saved) throw new Error('save');
      setSelected(returnDay);
      if (window.location.pathname === pathname) {
        const next = new URLSearchParams(search);
        next.delete('customExercise'); next.delete('customExerciseMode');
        router.replace(`${pathname}?${next}`, { scroll: false });
      }
    } catch { handlingReturn.current = ''; setReturnError(t('error')); }
    finally { setPending(false); }
  }, [draftId, returnProgram, returnDay, returnId, returnMode, pathname, search, router, updateDraft, flushDraft, t]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void acceptReturn(); });
    return () => { active = false; };
  }, [acceptReturn]);
  const allRest = template && draft && draft.days.length > 0 && draft.days.every(row => row.is_rest_day);
  const day = draft?.days.find(row => row.id === selected) ?? draft?.days.find(row => !row.is_rest_day) ?? draft?.days[0];
  const update = (operation: (current: ProgramDraft) => ProgramDraft) => {
    if (pending) return;
    setSent(false); state.update(operation);
  };
  async function start(templateId?: string) {
    if (pending || !playerId || template) return;
    setPending(true); setError('');
    try {
      if (draft && !await state.flush()) return;
      const result = await startTraining(playerId, templateId);
      if (!result.data) { setError(result.error); return; }
      state.replace(result.data); setSelected(''); setChoosing(false); setSent(false);
    } catch { setError(t('error')); } finally { setPending(false); }
  }
  async function send() {
    if (!draft || pending || template) return;
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
    <EditorHeader playerId={playerId} playerName={playerName} remainingDays={draft?.status === 'active' ? remainingDays : undefined} template={template} title={draft?.title}
      starting={Boolean(allRest)} status={state.status} busy={pending} disabled={!draft || choosing} onSend={() => void send()} onRetry={() => void state.flush()}
      onAssign={() => {
        if (!draft?.days.some(row => row.exercises.length)) { setError(et('emptyAssign')); return; }
        setError('');
        void (async () => { setPending(true); try { if (await state.flush()) setAssigning(true); } finally { setPending(false); } })();
      }}>
      {draft && !choosing && <fieldset disabled={pending}><WeekMenu key={`${draft.id}-${day?.id ?? ''}`} draft={draft} day={day} update={update} saved={state.status === 'saved'} onNew={template ? undefined : () => { setChoosing(true); setTemplates(false); }} /></fieldset>}
    </EditorHeader>
    {(error || state.error) && <p role="alert" className="text-sm text-danger">{error || state.error}</p>}
    {returnError && <div role="alert" className="text-sm text-danger"><p>{returnError}</p>
      <Button variant="secondary" disabled={pending} onClick={() => void acceptReturn()}>{t('retry')}</Button></div>}
    {sent && <p role="status" className="text-xs text-faint">{t('sent')}</p>}
    {pending && <p role="status" className="text-xs text-faint">{t('loading')}</p>}
    {choosing ? <><StartChoice templates={templates} onTemplates={() => setTemplates(value => !value)} onStart={id => void start(id)} busy={pending} />
      {draft && <Button variant="secondary" disabled={pending} className="min-h-12" onClick={() => setChoosing(false)}>{t('cancel')}</Button>}</> :
      draft && <fieldset disabled={pending} className="min-w-0 space-y-3.5">
          <div className={!template && draft.player_id
            ? 'min-w-0 space-y-3.5 [&>nav]:static [&>nav]:flex-row [&>nav]:overflow-x-auto'
            : 'grid min-w-0 items-start gap-4 min-[1001px]:grid-cols-[230px_minmax(0,1fr)]'}>
            <DayRail draft={draft} selectedId={day?.id} onSelect={setSelected} update={update} />
            <div className="min-w-0 space-y-3.5">
              {!template && playerFacts && <TrainingFacts {...playerFacts} locale={locale} draft={draft} day={day} />}
              {allRest ? <div className="glass-strong space-y-3 rounded-card p-5">
              <p className="text-sm text-muted">{et('startHint')}</p>
              <Button disabled={pending} onClick={() => { const first = draft.days[0]; if (first) { update(current => restDay(current, first.id, false)); setSelected(first.id); } }}><Dumbbell aria-hidden className="size-4" />{et('startFirst')}</Button>
            </div> : day ? <>
              <DaySummary day={day} update={update} />
              {day.is_rest_day ? <div className="glass space-y-3 rounded-card border border-dashed border-line-soft p-5 text-faint"><p>{et('rest')}</p><Button variant="secondary" className="min-h-12" onClick={() => update(current => restDay(current, day.id, false))}><Dumbbell aria-hidden className="size-4" />{et('restore')}</Button></div> : <>
                <WarmupBlock key={`warmup-${day.id}`} day={day} update={update} />
                <DayExercises key={day.id} day={day} update={update} flush={state.flush}
                  injuries={!template && draft.player_id ? playerFacts?.profile.intake?.injuries : undefined}
                  candidates={!template && draft.player_id ? playerFacts?.candidates : undefined} />
                <CardioBlock day={day} update={update} />
              </>}
            </> : <p className="glass rounded-card p-5 text-faint">{t('noDays')}</p>}</div>
          </div>
      </fieldset>}
    {template && assigning && draft && <AssignmentSheet programId={draft.id} onClose={() => setAssigning(false)} />}
    {!template && <details className="glass rounded-card border border-line-soft px-5 py-2">
      <summary className="flex min-h-12 cursor-pointer items-center text-xs text-muted">{t('history')}</summary>
      {programs.length ? programs.map(row => <Link key={row.id} href={`/captain/programs/${row.id}`} className="flex min-h-12 items-center justify-between gap-3 border-t border-line-soft text-sm">
        <span>{row.title}</span><span className="text-faint">{pt(row.status === 'active' ? 'active' : row.status === 'archived' ? 'archived' : 'draft')}</span>
      </Link>) : <p className="py-3 text-faint">{t('emptyPrograms')}</p>}
    </details>}
  </section>;
}

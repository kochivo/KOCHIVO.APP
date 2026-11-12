'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useT } from '@/core/i18n/client';
import { activateProgram, startTraining, useTrainingAutosave, validateForActivation, programMessages } from '@/features/programs';
import type { ProgramDraft } from '@/features/programs';
import { StartChoice } from './start-choice';
import { DayExercises } from './day-exercises';
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

type Props = { programs: { id: string; title: string; status: string }[]; playerName?: string; remainingDays?: number; facts?: ReactNode } & (
  { mode?: 'player'; playerId: string; initial: ProgramDraft | null } |
  { mode: 'template'; playerId?: never; initial: ProgramDraft }
);

export function TrainingEditor({ playerId, playerName, remainingDays, facts, initial, programs, mode = 'player' }: Props) {
  const t = useT(messages), pt = useT(programMessages), et = useT(editorMessages);
  const template = mode === 'template';
  const state = useTrainingAutosave(initial);
  const [selected, setSelected] = useState(''), [choosing, setChoosing] = useState(!initial);
  const [templates, setTemplates] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const draft = state.draft;
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
      status={state.status} busy={pending} disabled={!draft || choosing} onSend={() => void send()} onRetry={() => void state.flush()}
      onAssign={() => { void (async () => { setPending(true); try { if (await state.flush()) setAssigning(true); } finally { setPending(false); } })(); }} />
    {(error || state.error) && <p role="alert" className="text-sm text-danger">{error || state.error}</p>}
    {sent && <p role="status" className="text-xs text-faint">{t('sent')}</p>}
    {pending && <p role="status" className="text-xs text-faint">{t('loading')}</p>}
    {choosing ? <><StartChoice templates={templates} onTemplates={() => setTemplates(value => !value)} onStart={id => void start(id)} busy={pending} />
      {draft && <button disabled={pending} className="min-h-12 text-xs text-muted" onClick={() => setChoosing(false)}>{t('cancel')}</button>}</> :
      draft && <fieldset disabled={pending} className="min-w-0 space-y-3.5">
        <div className="flex justify-end"><WeekMenu key={`${draft.id}-${day?.id ?? ''}`} draft={draft} day={day} update={update} saved={state.status === 'saved'} onNew={template ? undefined : () => { setChoosing(true); setTemplates(false); }} /></div>
        <div className={facts ? 'grid min-w-0 items-start gap-[18px] min-[1400px]:grid-cols-[260px_minmax(0,1fr)]' : ''}>
          {facts}
          <div className="grid min-w-0 items-start gap-4 min-[1001px]:grid-cols-[230px_minmax(0,1fr)]">
            <DayRail draft={draft} selectedId={day?.id} onSelect={setSelected} update={update} />
            <div className="min-w-0 space-y-3.5">{day ? <>
              <DaySummary day={day} update={update} />
              {day.is_rest_day ? <div className="glass rounded-card border border-dashed border-line-soft p-5 text-faint"><p>{et('rest')}</p><button className="min-h-12 text-sm" onClick={() => update(current => restDay(current, day.id, false))}>{et('restore')}</button></div> : <>
                <WarmupBlock key={`warmup-${day.id}`} day={day} update={update} />
                <DayExercises key={day.id} day={day} update={update} />
                <CardioBlock day={day} update={update} />
              </>}
            </> : <p className="glass rounded-card p-5 text-faint">{t('noDays')}</p>}</div>
          </div>
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

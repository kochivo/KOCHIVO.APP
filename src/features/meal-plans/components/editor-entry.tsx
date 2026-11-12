'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { Button } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { usePlanDraft } from '../hooks/use-plan-draft';
import { useEditorAutosave } from '../hooks/use-editor-autosave';
import { loadEditorContext } from '../data/editor-context';
import { addMeal, setGrams } from '../draft';
import { copyTrainingMeals, dayMeals, dayTargets } from '../editor-rules';
import { planTotals } from '../totals';
import { MealEditor } from './meal-editor';
import { LiveTargets } from './live-targets';
import { SmartNotesPanel } from './smart-notes-panel';
import { TargetsBar } from './targets-bar';
import { messages } from './editor/messages';
import { messages as planMessages } from '../messages';
const PlayerEditor = dynamic(() => import('./editor/player-editor').then(module => module.PlayerEditor), { loading: () => <LoadingState variant="detail" /> });

export function EditorEntry({ planId }: { planId: string }) {
  const t = useT(messages);
  const planT = useT(planMessages);
  const state = usePlanDraft(planId, { clearErrorsOnEdit: true });
  useEditorAutosave(state);
  const { draft, update } = state;
  const [context, setContext] = useState<Awaited<ReturnType<typeof loadEditorContext>> | null>(null);
  const [contextError, setContextError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [cycles, setCycles] = useState(false);
  const [day, setDay] = useState<'training' | 'rest'>('training');
  const playerId = draft?.playerId;
  useEffect(() => {
    if (!playerId) return;
    let current = true;
    loadEditorContext(playerId).then(value => { if (current) { setContext(value); setContextError(false); } })
      .catch(() => { if (current) setContextError(true); });
    return () => { current = false; };
  }, [playerId, retry]);
  if (state.loading) return <LoadingState variant="detail" />;
  if (!draft) return <div role="alert">{state.error}<Button variant="secondary" onClick={state.reload}>{planT('tryAgain')}</Button></div>;
  if (playerId && !context) return contextError ? <div role="alert">{t('contextError')}<Button variant="secondary" onClick={() => setRetry(value => value + 1)}>{planT('tryAgain')}</Button></div> : <LoadingState variant="detail" />;
  if (playerId && context) return <PlayerEditor key={draft.id} data={{ context, draft, plans: [], fresh: false }} />;
  const split = cycles || draft.meals.some(meal => meal.dayType && meal.dayType !== 'all');
  const visible = split ? dayMeals(draft.meals, day) : draft.meals;
  const targets = split ? dayTargets(draft.targets, context?.facts.trainingDays?.value.length ?? 0, day) : draft.targets;
  const add = () => update(value => {
    const next = addMeal(value, planT('newMeal'), uuidv7());
    return { ...next, meals: next.meals.map((meal, i) => i === next.meals.length - 1 ? { ...meal, dayType: split ? day : 'all' } : meal) };
  });
  return <div className="mx-auto grid max-w-6xl gap-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <label>{planT('planName')}<input value={draft.title} maxLength={80} disabled={state.busy} onChange={event => update(value => ({ ...value, title: event.target.value }))}
        className="ms-2 min-h-12 rounded-control bg-surface px-3" /></label>
      <div role="status" className="text-sm text-muted">{state.error ? <>
        <span className="text-danger">{state.error}</span><Button variant="secondary" disabled={state.busy} onClick={() => void state.retrySave()}>{planT('tryAgain')}</Button>
      </> : state.busy || state.dirty ? t('saving') : null}</div>
      <Button variant="secondary" disabled={state.busy} onClick={() => void state.persist()}>{planT('savePlan')}</Button>
      {playerId && <Button disabled={state.busy} onClick={() => void state.persist(true)}>{t('send', { name: context?.name ?? '' })}</Button>}
    </header>
    <LiveTargets targets={targets} totals={planTotals({ ...draft, meals: visible })} />
    <fieldset disabled={state.busy} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
      <section className="grid content-start gap-4" aria-label={planT('meals')}>
        {split ? <div className="flex flex-wrap gap-2">
          {(['training', 'rest'] as const).map(value => <Button key={value} variant="secondary" aria-pressed={day === value} onClick={() => setDay(value)}>{t(value)}</Button>)}
          <Button variant="secondary" onClick={() => { update(value => copyTrainingMeals(value, uuidv7)); setDay('rest'); }}>{t('copy')}</Button>
        </div> : <Button variant="secondary" onClick={() => setCycles(true)}>{t('cycles')}</Button>}
        {!visible.length && <p className="text-muted">{planT('addYourFirstMealToStart')}</p>}
        {visible.map((meal, index) => <MealEditor key={meal.id} meal={meal} first={index === 0} last={index === visible.length - 1}
          update={update} enhanced facts={context?.facts ?? {}} day={split ? day : undefined} />)}
        <Button variant="secondary" onClick={add}>{planT('addMeal')}</Button>
      </section>
      <div className="grid content-start gap-4">
        {context && <SmartNotesPanel meals={visible} planMeals={draft.meals} targets={targets} facts={context.facts} logs={context.logs} today={context.today} sent={draft.status !== 'draft'}
          onIncrease={(id, grams) => update(value => {
            const item = value.meals.flatMap(meal => meal.items).find(item => item.id === id);
            return item ? setGrams(value, id, item.grams + grams, planT) : value;
          })} />}
        <TargetsBar targets={draft.targets} totals={planTotals({ ...draft, meals: visible })} onChange={targets => update(value => ({ ...value, targets }))} />
      </div>
    </fieldset>
  </div>;
}

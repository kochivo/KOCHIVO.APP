'use client';
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { KoMealPlans } from '@/ui/icons/ko-meal-plans';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { uuidv7 } from '@/core/offline/ids';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { usePlanDraft } from '../hooks/use-plan-draft';
import { useEditorAutosave } from '../hooks/use-editor-autosave';
import { addItem, addMeal } from '../draft';
import { dayMeals } from '../editor-rules';
import { nutritionTotals } from './editor/nutrition-values';
import { V11Macros } from './v11-macros';
import { V11Meal } from './v11-meal';
import { V11FoodPicker } from './v11-food-picker';
import { messages } from './v11/messages';
import { messages as planMessages } from '../messages';
import { planPlayers } from './v11-assignment';

const TargetsBar = dynamic(() => import('./targets-bar').then(module => module.TargetsBar));
const LegacyEditor = dynamic(() => import('./legacy-editor').then(module => module.LegacyEditor), { loading: () => <LoadingState variant="detail" /> });

export function V11Editor({ planId }: { planId: string }) {
  const t = useT(messages), pt = useT(planMessages);
  const state = usePlanDraft(planId, { clearErrorsOnEdit: true });
  useEditorAutosave(state);
  const [day, setDay] = useState<'training' | 'rest'>('training');
  const [selected, setSelected] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const { draft, update } = state;
  const loadUsage = useCallback(() => planPlayers(planId), [planId]);
  const usage = useResource(draft && !draft.playerId ? `v11-plan-usage:${planId}` : null, loadUsage);
  if (state.loading) return <LoadingState variant="detail" />;
  if (!draft) return <div role="alert">{state.error}<Button variant="secondary" onClick={state.reload}>{t('retry')}</Button></div>;
  if (draft.playerId) return <LegacyEditor planId={planId} />;
  const meals = dayMeals(draft.meals, day);
  const mealId = meals.some(meal => meal.id === selected) ? selected : meals[0]?.id;
  return <div className="grid min-w-0 gap-4">
    <PageBarTitle title={draft.title} subtitle={usage.data !== undefined ? t('usage', { n: usage.data }) : usage.error ? t('error') : t('loading')} />
    <PageBarActions><Link href="/captain/library/meal-plans" aria-label={t('back')} aria-disabled={state.dirty || state.busy} onNavigate={event => { if (state.dirty || state.busy) event.preventDefault(); }} className="grid min-h-12 min-w-12 place-items-center rounded-full glass"><KoMealPlans aria-hidden className="size-5" /></Link><Button disabled={state.busy} onClick={() => void state.persist()}>{t('save')}</Button></PageBarActions>
    {state.error && <p role="alert" className="text-danger">{state.error}</p>}
    {state.busy && <p role="status" className="text-muted">{pt('saving')}</p>}
    {state.dirty && !state.busy && <p role="status" className="text-xs text-muted">{pt('youHaveUnsavedChanges')}</p>}
    <div role="tablist" aria-label={pt('meals')} className="flex gap-2">{(['training', 'rest'] as const).map(value => <button key={value} type="button" role="tab" aria-selected={day === value} disabled={state.busy} onClick={() => {
      setDay(value); setPicker(false);
    }} className={`min-h-12 rounded-full px-5 text-sm ${day === value ? 'bg-lime/10 text-lime' : 'text-muted'}`}>{t(value)}</button>)}</div>
    <div className="grid min-w-0 items-start gap-4 min-[761px]:grid-cols-[minmax(0,1fr)_300px]">
      <fieldset disabled={state.busy} className="grid min-w-0 gap-3">
        <V11Macros totals={nutritionTotals(meals).totals} targets={draft.targets} />
        {!meals.length && <p className="glass rounded-card p-5 text-muted">{pt('addYourFirstMealToStart')}</p>}
        {meals.map(meal => <V11Meal key={meal.id} meal={meal} selected={meal.id === mealId} update={update} onSelect={() => { setSelected(meal.id); setPicker(true); }} />)}
        <Button variant="secondary" onClick={() => {
          const id = uuidv7(); update(current => {
            const next = addMeal(current, pt('newMeal'), id);
            return { ...next, meals: next.meals.map(meal => meal.id === id ? { ...meal, dayType: day } : meal) };
          }); setSelected(id);
        }}>{pt('addMeal')}</Button>
        <details onToggle={event => setTargetsOpen(event.currentTarget.open)}><summary className="min-h-12 cursor-pointer py-3 text-sm text-muted">{pt('targetsAndTotals')}</summary>
          <label className="mb-3 grid gap-2 text-sm text-muted">{pt('planName')}<input value={draft.title} maxLength={80} onChange={event => update(current => ({ ...current, title: event.target.value }))} className="min-h-12 rounded-control border border-line bg-transparent px-3 text-ink" /></label>
          {targetsOpen && <TargetsBar targets={draft.targets} totals={nutritionTotals(meals).totals} onChange={targets => update(current => ({ ...current, targets }))} />}
        </details>
      </fieldset>
      <aside className={picker ? 'min-w-0' : 'hidden min-w-0 min-[761px]:block'}><V11FoodPicker navigationDisabled={state.dirty || state.busy} disabled={!mealId || state.busy} onPick={food => {
        if (mealId) update(current => addItem(current, mealId, food, 100, uuidv7(), pt));
      }} /></aside>
    </div>
  </div>;
}

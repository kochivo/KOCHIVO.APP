'use client';
import { clickableClass, Button, buttonClass } from '@/ui/button';
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { KoMealPlans } from '@/ui/icons/ko-meal-plans';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { uuidv7 } from '@/core/offline/ids';

import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { usePlanDraft } from '../hooks/use-plan-draft';
import { useEditorAutosave } from '../hooks/use-editor-autosave';
import { addItem, addMeal } from '../draft';
import { dayMeals } from '../editor-rules';
import { nutritionTotals } from './editor/nutrition-values';
import { MealTargets } from './editor/meal-targets';
import { EditInPlace } from '@/ui/edit-in-place';
import { defaultPortion } from '../data/meal-portions';
import { messages as redesignMessages } from './editor/redesign/messages';
import { V11Meal } from './v11-meal';
import { V11FoodPicker } from './v11-food-picker';
import { messages } from './v11/messages';
import { messages as planMessages } from '../messages';
import { planPlayers } from './v11-assignment';

import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
import { formatNumber } from '@/lib/format';

const LegacyEditor = dynamic(() => import('./legacy-editor').then(module => module.LegacyEditor), { loading: () => <LoadingState variant="detail" /> });

export function V11Editor({ planId }: { planId: string }) {
  const t = useT(messages), pt = useT(planMessages);
  const rt = useT(redesignMessages);
  const success = useT(successMessages), toast = useToast(), locale = useLocale();
  const state = usePlanDraft(planId, { clearErrorsOnEdit: true });
  useEditorAutosave(state);
  const [day, setDay] = useState<'training' | 'rest'>('training');
  const { draft, update } = state;
  const loadUsage = useCallback(() => planPlayers(planId), [planId]);
  const usage = useResource(draft && !draft.playerId ? `v11-plan-usage:${planId}` : null, loadUsage);
  if (state.loading) return <LoadingState variant="detail" />;
  if (!draft) return <div role="alert">{state.error}<Button variant="secondary" onClick={state.reload}>{t('retry')}</Button></div>;
  if (draft.playerId) return <LegacyEditor planId={planId} />;
  const meals = dayMeals(draft.meals, day);
  return <div className="grid min-w-0 gap-4">
    <PageBarTitle title={draft.title} subtitle={usage.data !== undefined ? t('usage', { n: usage.data }) : usage.error ? t('error') : t('loading')} />
    <PageBarActions><Link href="/captain/library/meal-plans" aria-label={t('back')} aria-disabled={state.dirty || state.busy} onNavigate={event => { if (state.dirty || state.busy) event.preventDefault(); }} className={buttonClass({ variant: 'secondary', block: false, className: "grid min-h-12 min-w-12 place-items-center" })}><KoMealPlans aria-hidden className="size-5" /></Link><Button disabled={state.busy} onClick={() => void state.persist(false, true)}>{t('save')}</Button></PageBarActions>
    {state.error && <p role="alert" className="text-danger">{state.error}</p>}
    {state.busy && <p role="status" className="text-muted">{pt('saving')}</p>}
    {state.dirty && !state.busy && <p role="status" className="text-xs text-muted">{pt('youHaveUnsavedChanges')}</p>}
    <div role="tablist" aria-label={pt('meals')} className="flex gap-2">{(['training', 'rest'] as const).map(value => <button key={value} type="button" role="tab" aria-selected={day === value} disabled={state.busy} onClick={() => {
      setDay(value);
    }} className={`${clickableClass} press min-h-12 cursor-pointer rounded-full border border-line px-5 text-sm focus-visible:ring-2 focus-visible:ring-lime ${day === value ? 'bg-lime/10 text-lime' : 'bg-surface text-muted'}`}>{t(value)}</button>)}</div>
    <div className="grid min-w-0 items-start gap-3 min-[1001px]:grid-cols-[minmax(0,1fr)_300px]">
      <fieldset disabled={state.busy} className="grid min-w-0 gap-3">
        <EditInPlace label={pt('planName')} value={draft.title} maxLength={80} onChange={event => update(current => ({ ...current, title: event.target.value }))} />
        <MealTargets totals={nutritionTotals(meals).totals} targets={draft.targets} onChange={targets => update(current => ({ ...current, targets }))} />
        {!meals.length && <p className="glass rounded-card p-5 text-muted">{pt('addYourFirstMealToStart')}</p>}
        {meals.map(meal => <V11Meal key={meal.id} meal={meal} day={day} update={update} />)}
        <Button variant="secondary" className="border border-dashed border-lime/40 text-lime" onClick={() => {
          const id = uuidv7(); update(current => {
            const names = [rt('breakfast'), rt('snack'), rt('lunch'), rt('dinner')];
            const next = addMeal(current, names[meals.length] ?? rt('meal', { n: meals.length + 1 }), id);
            return { ...next, meals: next.meals.map(meal => meal.id === id ? { ...meal, dayType: day } : meal) };
          });
        }}>{rt('addMeal')}</Button>
      </fieldset>
      <aside className="min-w-0 min-[1001px]:sticky min-[1001px]:top-0 min-[1001px]:max-h-[calc(100dvh-200px)] min-[1001px]:overflow-y-auto"><V11FoodPicker meals={meals} navigationDisabled={state.dirty || state.busy} disabled={!meals.length || state.busy} onPick={(food, mealId) => {
        if (mealId) { const portion = defaultPortion(food), id = uuidv7();
          update(current => { const next = addItem(current, mealId, food, portion.grams, id, pt); return { ...next, meals: next.meals.map(meal => ({ ...meal, items: meal.items.map(item => item.id === id ? { ...item, unit: portion.unit } : item) })) }; });
          toast.success({ title: success('added'), detail: success('foodDetail', { name: locale === 'en' ? food.nameEn || food.name : food.name, grams: formatNumber(portion.grams, locale) }), icon: 'meal' }); }
      }} /></aside>
    </div>
  </div>;
}

'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import Link from 'next/link';
import { uuidv7 } from '@/core/offline/ids';
import { Utensils } from 'lucide-react';
import { Button, EmptyState } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { SaveTemplateButton, templateMessages } from '@/features/templates';
import { usePlanDraft } from '../hooks/use-plan-draft';
import { addMeal } from '../draft';
import { planTotals } from '../totals';
import { TargetsBar } from './targets-bar';
import { MealEditor } from './meal-editor';

export function PlanBuilder({ planId }: { planId: string }) {
  const t = useT(messages);
  const templateT = useT(templateMessages);
  const state = usePlanDraft(planId);
  const { draft, update } = state;
  if (state.loading) return <LoadingState variant="detail" />;
  if (!draft) return <div role="alert">{state.error}<Button variant="secondary" onClick={state.reload}>{t('tryAgain')}</Button></div>;
  return <div className="mx-auto grid max-w-6xl gap-card-gap">
    <Link className="inline-flex min-h-12 items-center text-muted" href={draft.playerId ? `/captain/players/${draft.playerId}/nutrition` : '/captain/library/meal-plans'}>{t('mealPlans')}</Link>
    <header className="flex flex-wrap items-end justify-between gap-card-gap">
      <label className="grid gap-inline"><span className="text-sm text-muted">{t('planName')}</span>
        <input aria-label={t('planName')} disabled={state.busy} maxLength={80} value={draft.title} onChange={event => update(d => ({ ...d, title: event.target.value }))}
          className="min-h-12 rounded-control border border-line bg-surface px-page-x text-2xl font-bold" /></label>
      <div className="flex flex-wrap gap-inline">
        {!state.dirty && !state.busy && draft.playerId && <SaveTemplateButton kind="nutrition" id={draft.id} title={draft.title} />}
        <Button variant={draft.playerId ? 'secondary' : 'primary'} disabled={state.busy} onClick={() => void state.persist(false, true)}>{draft.playerId ? t('savePlan') : templateT('saveTemplate')}</Button>
        {draft.playerId && <Button disabled={state.busy} onClick={() => void state.persist(true)}>{t('activateForPlayer')}</Button>}
      </div>
    </header>
    {state.busy && <p role="status">{t('saving')}</p>}
    {state.dirty && <p className="text-warn">{t('youHaveUnsavedChanges')}</p>}
    {state.error && <div role="alert" className="text-danger">{state.error}<Button variant="secondary" onClick={() => void state.retrySave()}>{t('tryAgain')}</Button></div>}
    <fieldset disabled={state.busy} className="grid min-w-0 gap-card-gap lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
      <section aria-label={t('meals')} className="grid content-start gap-card-gap">
        {!draft.meals.length && <EmptyState icon={Utensils} title={t('addYourFirstMealToStart')} body={t('emptyBody')}
          action={{ label: t('addMeal'), onClick: () => { const id = uuidv7(); update(d => addMeal(d, t('newMeal'), id)); } }} />}
        {draft.meals.map((meal, index) => <MealEditor key={meal.id} meal={meal} first={index === 0} last={index === draft.meals.length - 1} update={update} />)}
        {draft.meals.length > 0 && <Button variant="secondary" onClick={() => { const id = uuidv7(); update(d => addMeal(d, t('newMeal'), id)); }}>{t('addMeal')}</Button>}
      </section>
      <aside><TargetsBar targets={draft.targets} totals={planTotals(draft)} onChange={targets => update(d => ({ ...d, targets }))} /></aside>
    </fieldset>
  </div>;
}

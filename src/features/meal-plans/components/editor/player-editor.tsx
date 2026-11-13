'use client';

import { KoSend } from '@/ui/icons/ko-send';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CloudCheck, Send } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { SaveStatus } from '@/ui/save-status';
import { formatNumber } from '@/lib/format';
import { addMeal, setGrams } from '../../draft';
import { copyTrainingMeals, dayMeals, dayTargets } from '../../editor-rules';
import { nutritionTotals } from './nutrition-values';
import { usePlanDraft } from '../../hooks/use-plan-draft';
import { useEditorAutosave } from '../../hooks/use-editor-autosave';
import { savePlayerEditor } from '../../data/player-editor';
import type { loadPlayerEditor } from '../../data/player-editor';
import { automaticTargets, openRestDay } from './workspace-model';
import { TargetTiles } from './target-tiles';
import { MealCard } from './meal-card';
import { WeekCard } from './week-card';
import { messages } from './workspace/messages';
import { messages as planMessages } from '../../messages';
import { NewPlanButton } from './new-plan-button';
import type { PlanDraft } from '../../types';
import { messages as editorMessages } from './messages';
import { PlayerFactsCard } from './player-facts';

async function saveTemplate(draft: PlanDraft) {
  const { savePlan } = await import('../../data/plan-io');
  return savePlan(draft);
}

const SmartNotesPanel = dynamic(() => import('../smart-notes-panel').then(module => module.SmartNotesPanel));
const TargetsBar = dynamic(() => import('../targets-bar').then(module => module.TargetsBar));
const TargetCalculator = dynamic(() => import('./target-calculator').then(module => module.TargetCalculator));

export function PlayerEditor({ data }: { data: Awaited<ReturnType<typeof loadPlayerEditor>> }) {
  const SendIcon = captainWorkspaceEnabled() ? KoSend : Send;
  const t = useT(messages);
  const planT = useT(planMessages);
  const editorT = useT(editorMessages);
  const locale = useLocale();
  const template = !data.draft.playerId;
  const state = usePlanDraft(data.draft.id, { initialDraft: data.draft, clearErrorsOnEdit: true, save: template ? saveTemplate : savePlayerEditor });
  useEditorAutosave(state);
  const [day, setDay] = useState<'training' | 'rest'>('training');
  const [more, setMore] = useState(false);
  const [calculator, setCalculator] = useState(false);
  const { draft, update } = state;
  if (!draft) return null;
  const { context } = data;
  const facts = context.facts;
  const name = context.name;
  const visible = dayMeals(draft.meals, day);
  const split = draft.meals.some(meal => meal.dayType === 'training' || meal.dayType === 'rest');
  const targets = split ? dayTargets(draft.targets, facts.trainingDays?.value.length ?? 0, day) : draft.targets;
  const { totals, incomplete } = nutritionTotals(visible);
  const goal = facts.targetWeight?.value == null || facts.weight?.value === facts.targetWeight.value ? 'maintain'
    : (facts.weight?.value ?? 0) > facts.targetWeight.value ? 'cut' : 'bulk';
  return <div className="min-w-0">
    <header className="mb-[18px] flex flex-wrap items-center gap-3.5">
      {template ? <label className="min-w-0 text-xs text-faint">{planT('planName')}<input value={draft.title} maxLength={80} disabled={state.busy} onChange={event => update(current => ({ ...current, title: event.target.value }))}
        className="block min-h-12 w-full bg-transparent font-display text-[30px] font-semibold text-ink" /></label> :
        <><span aria-hidden className="grid size-[42px] shrink-0 place-items-center rounded-full border border-line bg-lime/10 font-display text-lime">{name.slice(0, 1)}</span>
        <div><p className="text-xs text-faint">{t('breadcrumb', { name })}</p><h1 className="font-display text-[30px] font-semibold leading-tight">{t('title', { name: locale === 'ar' ? name.split(' ')[0] ?? name : name })}</h1></div></>}
      <div className="ms-auto">{!state.error && !state.busy && !state.dirty ? <span role="status" className="inline-flex items-center gap-2 text-xs text-faint"><CloudCheck aria-hidden className="size-4 text-lime" />{editorT('saved')}</span>
        : <SaveStatus locale={locale} status={state.error ? 'error' : 'saving'} onRetry={() => void state.retrySave()} />}</div>
      <Button disabled={state.busy} className="min-h-12 rounded-full" onClick={() => void state.persist(!template)}><SendIcon aria-hidden className="size-4" />{template ? planT('savePlan') : t('send')}</Button>
    </header>
    {state.error && <p role="alert" className="mb-3 text-sm text-danger">{state.error}</p>}
    {calculator && <TargetCalculator facts={facts} onApply={targets => { update(draft => ({ ...draft, targets })); setCalculator(false); }} />}
    <TargetTiles totals={totals} targets={targets} incomplete={incomplete} />
    <div className="mb-3.5 flex flex-wrap items-center gap-2">
      {(['training', 'rest'] as const).map(value => <Chip key={value} disabled={state.busy} pressed={day === value} className={day === value ? '!border-ink !bg-ink !text-bg-deep' : 'bg-transparent'} onClick={() => {
        if (value === 'rest') update(draft => openRestDay(draft, uuidv7));
        setDay(value);
      }}>{t(value)}</Chip>)}<p className="text-xs text-faint">{split ? t('restDifference', { kcal: formatNumber(Math.max(0,
        dayTargets(draft.targets, facts.trainingDays?.value.length ?? 0, 'training').kcal - dayTargets(draft.targets, facts.trainingDays?.value.length ?? 0, 'rest').kcal), locale) }) : t('restHint')}</p>
      {template && split && <Button variant="secondary" disabled={state.busy} className="min-h-12 rounded-full" onClick={() => {
        update(current => copyTrainingMeals(current, uuidv7)); setDay('rest');
      }}>{editorT('copy')}</Button>}
    </div>
    <div className={template ? 'min-w-0' : 'grid min-w-0 items-start gap-4 min-[1001px]:grid-cols-[minmax(0,1fr)_280px]'}>
    <fieldset disabled={state.busy} className="min-w-0">
      {!visible.length && <p className="glass mb-3 rounded-card p-5 text-faint">{t('empty')}</p>}
      {visible.map((meal, index) => <MealCard key={meal.id} meal={meal} update={update} facts={facts} day={day} first={index === 0} last={index === visible.length - 1} />)}
      <Button variant="secondary" className="min-h-12 rounded-full" onClick={() => update(draft => {
        const names = [t('breakfast'), t('lunch'), t('dinner')];
        const next = addMeal(draft, names[visible.length] ?? t('newMeal'), uuidv7());
        return { ...next, meals: next.meals.map((meal, index) => index === next.meals.length - 1 ? { ...meal, dayType: split || day === 'rest' ? day : 'all' } : meal) };
      })}>{t('addMeal')}</Button>
      {!template && <div className="mt-[18px] grid gap-[18px] min-[1001px]:grid-cols-2">
        <WeekCard logs={context.logs} today={context.today} meals={draft.meals} trainingDays={facts.trainingDays?.value ?? []} sent={draft.status !== 'draft'} />
        <section className="glass rounded-card border border-line-soft px-5 py-[18px]"><h2 className="mb-1.5 font-display text-[19px] font-semibold">{t('notes')}</h2>
          <textarea disabled aria-label={t('notes')} placeholder={t('notePlaceholder')} className="min-h-12 w-full resize-none bg-transparent text-[12.5px] placeholder:text-faint" />
          <p className="text-xs text-faint">{t('noteGap')}</p></section>
      </div>}
      <details className="mt-[18px] text-muted" onToggle={event => setMore(event.currentTarget.open)}><summary className="flex min-h-12 cursor-pointer items-center">{t('more')}</summary>
        <p className="text-xs text-faint">{automaticTargets(facts) ? t('calculated', { name }) : t('missing')}</p>
        <p className="text-xs text-faint">{t('facts', { weight: facts.weight ? formatNumber(facts.weight.value, locale) : '—', goal: t(goal), days: formatNumber(facts.trainingDays?.value.length ?? 0, locale) })}</p>
        <Button variant="secondary" aria-expanded={calculator} disabled={state.busy} onClick={() => setCalculator(!calculator)} className="min-h-12 rounded-full">{t('edit')}</Button>
        {more && <div className="grid gap-[18px] min-[1001px]:grid-cols-2">{!template && <SmartNotesPanel meals={visible} planMeals={draft.meals} targets={targets} facts={facts} logs={context.logs} today={context.today} sent={draft.status !== 'draft'}
          onIncrease={(id, grams) => update(draft => {
            const item = draft.meals.flatMap(meal => meal.items).find(item => item.id === id);
            return item ? setGrams(draft, id, item.grams + grams) : draft;
          })} />}<TargetsBar targets={draft.targets} totals={totals} onChange={targets => update(draft => ({ ...draft, targets }))} /></div>}
      </details>
    </fieldset>
    {!template && <PlayerFactsCard name={name} facts={facts} meals={draft.meals} logs={context.logs} today={context.today} sent={draft.status !== 'draft'} />}
    </div>
    {!template && <details className="mt-3 text-muted"><summary className="flex min-h-12 cursor-pointer items-center">{t('library')}</summary>
      {!data.plans.length && <p className="text-xs text-faint">{planT('noPlansYetCreateANewOne')}</p>}
      <ul>{data.plans.map(plan => <li key={plan.id}><Link className="flex min-h-12 items-center gap-3" href={`/captain/nutrition/${plan.id}`}>{plan.title}<span className="text-xs text-faint">{plan.status === 'active' ? planT('active') : plan.status === 'archived' ? planT('archived') : planT('draft')}</span></Link></li>)}</ul>
      {draft.playerId && <NewPlanButton playerId={draft.playerId} disabled={state.busy || state.dirty} />}
      <Link href="/captain/templates" className="flex min-h-12 items-center">{t('library')}</Link>
    </details>}
  </div>;
}

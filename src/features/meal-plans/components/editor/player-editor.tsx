'use client';

import { editableFieldClass } from '@/ui/edit-in-place';
import { KoSend } from '@/ui/icons/ko-send';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CloudCheck, Send } from 'lucide-react';
import { Disclosure } from '@/ui/disclosure';
import { RowLink } from '@/ui/row-link';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import { useLocale, useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { Button, buttonClass } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { SaveStatus } from '@/ui/save-status';
import { formatNumber } from '@/lib/format';
import { addMeal, setGrams, addItem } from '../../draft';
import { copyTrainingMeals, dayMeals, dayTargets } from '../../editor-rules';
import { nutritionTotals } from './nutrition-values';
import { usePlanDraft } from '../../hooks/use-plan-draft';
import { useEditorAutosave } from '../../hooks/use-editor-autosave';
import { savePlayerEditor } from '../../data/player-editor';
import type { loadPlayerEditor } from '../../data/player-editor';
import { automaticTargets, openRestDay } from './workspace-model';
import { MealTargets } from './meal-targets';
import { WaterTarget } from './water-target';
import { V11FoodPicker } from '../v11-food-picker';
import { defaultPortion } from '../../data/meal-portions';

import { messages as redesignMessages } from './redesign/messages';
import { MealCard } from './meal-card';
import { WeekCard } from './week-card';
import { messages } from './workspace/messages';
import { messages as planMessages } from '../../messages';
import { NewPlanButton } from './new-plan-button';
import type { PlanDraft } from '../../types';
import { messages as editorMessages } from './messages';
import { PlayerFactsCard } from './player-facts';
import { messages as budgetMessages } from '../../budget/messages';

async function saveTemplate(draft: PlanDraft) {
  const { savePlan } = await import('../../data/plan-io');
  return savePlan(draft);
}

const SmartNotesPanel = dynamic(() => import('../smart-notes-panel').then(module => module.SmartNotesPanel));
const TargetsBar = dynamic(() => import('../targets-bar').then(module => module.TargetsBar));
const TargetCalculator = dynamic(() => import('./target-calculator').then(module => module.TargetCalculator));
const BudgetSheet = dynamic(() => import('../budget-sheet').then(module => module.BudgetSheet));

export function PlayerEditor({ data, editableMealNames = false, restViewOnly = false }: {
  data: Awaited<ReturnType<typeof loadPlayerEditor>>; editableMealNames?: boolean; restViewOnly?: boolean;
}) {
  const SendIcon = captainWorkspaceEnabled() ? KoSend : Send;
  const t = useT(messages);
  const rt = useT(redesignMessages);
  const planT = useT(planMessages);
  const editorT = useT(editorMessages);
  const budgetT = useT(budgetMessages);
  const locale = useLocale();
  const template = !data.draft.playerId;
  const state = usePlanDraft(data.draft.id, { initialDraft: data.draft, clearErrorsOnEdit: true, save: template ? saveTemplate : savePlayerEditor, playerName: data.context.name });
  useEditorAutosave(state);
  const [day, setDay] = useState<'training' | 'rest'>('training');
  const [more, setMore] = useState(false);
  const [calculator, setCalculator] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
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
  return <div onBlur={() => void state.persist()} className="min-w-0">
    <header className="mb-card-gap flex flex-wrap items-center gap-card-gap">
      {template ? <label className="min-w-0 text-xs text-faint">{planT('planName')}<input value={draft.title} maxLength={80} disabled={state.busy} onChange={event => update(current => ({ ...current, title: event.target.value }))}
        className={`${editableFieldClass} block min-h-12 w-full bg-surface font-display text-stat font-semibold text-ink`} /></label> :
        <><span aria-hidden className="grid size-[42px] shrink-0 place-items-center rounded-full border border-line bg-lime/10 font-display text-lime">{name.slice(0, 1)}</span>
        <div><p className="text-xs text-faint">{t('breadcrumb', { name })}</p><h1 className="font-display text-stat font-semibold leading-tight">{t('title', { name: locale === 'ar' ? name.split(' ')[0] ?? name : name })}</h1></div></>}
      <div className="ms-auto">{!state.error && !state.busy && !state.dirty ? <span role="status" className="inline-flex items-center gap-inline text-xs text-faint"><CloudCheck aria-hidden className="size-4 text-lime" />{editorT('saved')}</span>
        : <SaveStatus locale={locale} status={state.error ? 'error' : 'saving'} onRetry={() => void state.retrySave()} />}</div>
      <Button disabled={state.busy} className="min-h-12 rounded-full" onClick={() => void state.persist(!template, true)}><SendIcon aria-hidden className="size-4" />{template ? planT('savePlan') : t('send')}</Button>
    </header>
    {state.error && <p role="alert" className="mb-stack text-sm text-danger">{state.error}</p>}
    {!template && <Button id="budget-plan-open" variant="secondary" disabled={state.busy} onClick={() => setBudgetOpen(true)}>{budgetT('title')}</Button>}
    {budgetOpen && <BudgetSheet draft={draft} targets={targets} dayType={split ? day : 'all'} onClose={() => setBudgetOpen(false)} onApply={next => update(() => next)} />}
    {calculator && <TargetCalculator facts={facts} onApply={targets => { update(draft => ({ ...draft, targets })); setCalculator(false); }} />}
    <MealTargets totals={totals} targets={draft.targets} onChange={targets => update(draft => ({ ...draft, targets }))} />
    <WaterTarget value={draft.waterTargetMl} weightKg={facts.weight?.value} disabled={state.busy}
      onChange={waterTargetMl => update(draft => ({ ...draft, waterTargetMl }))} />
    {incomplete && <p className="text-xs text-warn">{t('incomplete')}</p>}
    <div className="mb-card-gap flex flex-wrap items-center gap-inline">
      {(['training', 'rest'] as const).map(value => <Chip key={value} disabled={state.busy} pressed={day === value} className={day === value ? '!border-ink !bg-ink !text-bg-deep' : 'bg-transparent'} onClick={() => {
        if (!restViewOnly && value === 'rest') update(current => openRestDay(current, uuidv7));
        setDay(value);
      }}>{t(value)}</Chip>)}<p className="text-xs text-faint">{split ? t('restDifference', { kcal: formatNumber(Math.max(0,
        dayTargets(draft.targets, facts.trainingDays?.value.length ?? 0, 'training').kcal - dayTargets(draft.targets, facts.trainingDays?.value.length ?? 0, 'rest').kcal), locale) }) : t(restViewOnly ? 'restViewHint' : 'restHint')}</p>
      {restViewOnly && day === 'rest' && draft.meals.length > 0 && !draft.meals.some(meal => meal.dayType === 'rest') &&
        <Button variant="secondary" disabled={state.busy} className="min-h-12 rounded-full"
          onClick={() => update(current => openRestDay(current, uuidv7))}>{t('createRestMeals')}</Button>}
      {template && split && <Button variant="secondary" disabled={state.busy} className="min-h-12 rounded-full" onClick={() => {
        update(current => copyTrainingMeals(current, uuidv7)); setDay('rest');
      }}>{editorT('copy')}</Button>}
    </div>
    <div className={template ? 'min-w-0' : 'grid min-w-0 items-start gap-card-gap min-[1001px]:grid-cols-[minmax(0,1fr)_280px]'}>
    <fieldset disabled={state.busy} className="min-w-0">
      {!visible.length && <p className="mb-stack text-muted">{t('empty')}</p>}
      {visible.map((meal, index) => {
        const props = { meal, update, facts, day, first: index === 0, last: index === visible.length - 1 };
        return template ? <MealCard key={meal.id} {...props} editableName />
          : <MealCard key={meal.id} {...props} editableName={editableMealNames && !template} />;
      })}
      <Button variant="secondary" className="min-h-12 w-full rounded-control border border-dashed border-lime/40 text-lime" onClick={() => update(draft => {
        const names = [rt('breakfast'), rt('snack'), rt('lunch'), rt('dinner')];
        const next = addMeal(draft, names[visible.length] ?? rt('meal', { n: visible.length + 1 }), uuidv7());
        return { ...next, meals: next.meals.map((meal, index) => index === next.meals.length - 1 ? { ...meal, dayType: split || day === 'rest' ? day : 'all' } : meal) };
      })}>{t('addMeal')}</Button>
      {!template && <div className="mt-card-gap grid gap-card-gap min-[1001px]:grid-cols-2">
        <WeekCard logs={context.logs} today={context.today} meals={draft.meals} trainingDays={facts.trainingDays?.value ?? []} sent={draft.status !== 'draft'} />
        <section className="glass rounded-card border border-line-soft px-page-x py-page-y"><h2 className="mb-inline font-display text-title font-semibold">{t('notes')}</h2>
          <textarea disabled aria-label={t('notes')} placeholder={t('notePlaceholder')} className="min-h-12 w-full resize-none bg-transparent text-xs placeholder:text-faint" />
          <p className="text-xs text-faint">{t('noteGap')}</p></section>
      </div>}
      <Disclosure label={t('more')} className="mt-card-gap text-muted" onToggle={event => setMore(event.currentTarget.open)}>
        <p className="text-xs text-faint">{automaticTargets(facts) ? t('calculated', { name }) : t('missing')}</p>
        <p className="text-xs text-faint">{t('facts', { weight: facts.weight ? formatNumber(facts.weight.value, locale) : '—', goal: t(goal), days: formatNumber(facts.trainingDays?.value.length ?? 0, locale) })}</p>
        <Button variant="secondary" aria-expanded={calculator} disabled={state.busy} onClick={() => setCalculator(!calculator)} className="min-h-12 rounded-full">{t('edit')}<DisclosureChevron expanded={calculator} /></Button>
        {more && <div className="grid gap-card-gap min-[1001px]:grid-cols-2">{!template && <SmartNotesPanel meals={visible} planMeals={draft.meals} targets={targets} facts={facts} logs={context.logs} today={context.today} sent={draft.status !== 'draft'}
          onIncrease={(id, grams) => update(draft => {
            const item = draft.meals.flatMap(meal => meal.items).find(item => item.id === id);
            return item ? setGrams(draft, id, item.grams + grams) : draft;
          })} />}<TargetsBar targets={draft.targets} totals={totals} onChange={targets => update(draft => ({ ...draft, targets }))} /></div>}
      </Disclosure>
    </fieldset>
    <aside className="grid min-w-0 gap-card-gap"><V11FoodPicker meals={visible} disabled={state.busy || !visible.length} navigationDisabled={state.dirty || state.busy} onPick={(food, mealId) => {
      if (!mealId) return;
      const portion = defaultPortion(food), id = uuidv7();
      update(draft => { const next = addItem(draft, mealId, food, portion.grams, id, planT); return { ...next, meals: next.meals.map(meal => ({ ...meal, items: meal.items.map(item => item.id === id ? { ...item, unit: portion.unit } : item) })) }; });
    }} />{!template && <PlayerFactsCard name={name} facts={facts} meals={draft.meals} logs={context.logs} today={context.today} sent={draft.status !== 'draft'} />}</aside>
    </div>
    {!template && <Disclosure label={t('library')} className="mt-stack text-muted">
      {!data.plans.length && <p className="text-xs text-faint">{planT('noPlansYetCreateANewOne')}</p>}
      <ul>{data.plans.map(plan => <li key={plan.id}><RowLink href={`/captain/nutrition/${plan.id}`}>{plan.title}<span className="ms-stack text-xs text-muted">{plan.status === 'active' ? planT('active') : plan.status === 'archived' ? planT('archived') : planT('draft')}</span></RowLink></li>)}</ul>
      {draft.playerId && <NewPlanButton playerId={draft.playerId} disabled={state.busy || state.dirty} />}
      <Link href="/captain/templates" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x" })}>{t('library')}</Link>
    </Disclosure>}
  </div>;
}

'use client';
import { NumberInput } from '@/ui/number-input';
import { useCallback, useId, useState } from 'react';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { uuidv7 } from '@/core/offline/ids';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { formatNumber } from '@/lib/format';
import { loadFoodPrices } from '../data/food-prices';
import { budgetPlan } from '../budget-plan';
import type { BudgetDay, BudgetFood } from '../budget-plan';
import type { PlanDraft } from '../types';
import { BudgetResult } from './budget-result';
import { messages } from '../budget/messages';
import type { Macros } from '@/lib/macros';
import { KoMealPlans } from '@/ui/icons/ko-meal-plans';

export function BudgetSheet({ draft, targets, dayType, onApply, onClose }: {
  draft: PlanDraft; targets: Macros; dayType: 'all' | 'training' | 'rest'; onApply: (draft: PlanDraft) => void; onClose: () => void;
}) {
  const t = useT(messages), locale = useLocale(), titleId = useId();
  const loader = useCallback(() => loadFoodPrices(draft.playerId ?? undefined), [draft.playerId]);
  const resource = useResource(`budget-sheet:${draft.playerId}`, loader);
  const [selected, setSelected] = useState<string[] | null>(null), [count, setCount] = useState(4);
  const [result, setResult] = useState<BudgetDay>();
  const foods = resource.data?.foods.flatMap(row => row.budgetFood ? [{ ...row.budgetFood, name: locale === 'en' ? row.name_en || row.name_ar : row.name_ar }] : []) ?? [];
  function apply(reduce = false) {
    if (!result) return;
    const meals = result.meals.filter(meal => meal.items.length).map((meal, index) => ({
      id: uuidv7(), name: t(meal.tag), position: index + 1, dayType,
      items: meal.items.map((item, position) => ({ id: uuidv7(), grams: item.grams, position: position + 1, alternatives: [],
        food: { ...item.food, photo: null, custom: false } })),
    }));
    const retained = draft.meals.filter(meal => dayType !== 'all' && meal.dayType !== dayType && meal.dayType !== 'all');
    onApply({ ...draft, targets: reduce ? { ...draft.targets, protein: Math.floor(result.macros.protein) } : draft.targets,
      meals: [...retained, ...meals].map((meal, index) => ({ ...meal, position: index + 1 })) });
    onClose();
  }
  return <ResponsiveDialog modal fallbackId="budget-plan-open" openerId="budget-plan-open" onDismiss={onClose} aria-labelledby={titleId}
    className="sheet fixed inset-0 m-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-card border border-line text-ink">
    <header className="flex items-center justify-between gap-stack p-card"><h2 id={titleId} className="text-title font-semibold">{t('title')}</h2><IconButton aria-label={t('close')} onClick={onClose}><X aria-hidden /></IconButton></header>
    <div className="space-y-card-gap overflow-y-auto p-card">
      {!resource.data ? resource.error ? <div role="alert">{t('error')}<Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div> : <LoadingState /> : !resource.data.daily ? <p>{t('noBudget')}</p> : <>
        <div className="glass-strong rounded-card p-card"><p className="text-sm text-muted">{t('budget')}</p><p className="text-stat font-extrabold"><bdi>{t('money', { n: formatNumber(Math.floor(resource.data.daily), locale) })}</bdi></p></div>
        <div className="grid grid-cols-2 gap-stack">{(['kcal', 'protein'] as const).map(key => <div key={key} className="glass rounded-control p-card"><p className="text-xs text-muted">{t(key)}</p><bdi className="text-title font-bold">{formatNumber(targets[key], locale)}</bdi></div>)}</div>
        <NumberInput label={t('meals')} min={1} max={8} value={count} onCommit={value => { setCount(value); setResult(undefined); }} />
        <fieldset><legend className="mb-stack text-sm text-muted">{t('foods')}</legend><div className="flex flex-wrap gap-inline">{foods.map(food => <Button key={food.id} variant="secondary" className="rounded-full! aria-pressed:border-lime aria-pressed:bg-lime-soft! aria-pressed:text-lime!" aria-pressed={(selected ?? foods.map(food => food.id)).includes(food.id)} onClick={() => {
          const current = selected ?? foods.map(food => food.id); setSelected(current.includes(food.id) ? current.filter(id => id !== food.id) : [...current, food.id]); setResult(undefined);
        }}>{food.name}</Button>)}</div>{!foods.length && <p>{t('empty')}</p>}</fieldset>
        {result && <BudgetResult day={result} onApply={apply} playerId={draft.playerId ?? ''} />}
      </>}
    </div>
    {!result && !!resource.data?.daily && <footer className="sticky bottom-0 border-t border-line p-card"><Button block disabled={!foods.length || selected?.length === 0 || count < 1 || count > 8 || !Number.isInteger(count)} onClick={() => setResult(budgetPlan({
      kcal: targets.kcal, protein: targets.protein, mealsPerDay: count, dailyBudget: resource.data?.daily ?? 0,
      foods: foods.filter((food: BudgetFood) => selected === null || selected.includes(food.id)),
    }))}><KoMealPlans aria-hidden className="size-5" />{t('generate')}</Button></footer>}
  </ResponsiveDialog>;
}

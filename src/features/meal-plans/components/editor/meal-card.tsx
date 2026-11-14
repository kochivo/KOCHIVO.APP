'use client';

import { IconButton } from '@/ui/icon-button';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Ellipsis } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import type { PlayerFacts } from '@/features/player-file';
import { formatNumber } from '@/lib/format';
import { addItem } from '../../draft';
import { nutritionTotals } from './nutrition-values';
import type { Meal, PlanDraft } from '../../types';
import { FoodRow } from './food-row';
import { FoodSearch } from './food-search';
import { messages } from './workspace/messages';
import { messages as planMessages } from '../../messages';

const MealEditor = dynamic(() => import('../meal-editor').then(module => module.MealEditor));

export function MealCard({ meal, update, facts, day, first, last }: {
  meal: Meal; update: (change: (draft: PlanDraft) => PlanDraft) => void;
  facts: PlayerFacts; day: 'training' | 'rest'; first: boolean; last: boolean;
}) {
  const t = useT(messages);
  const planT = useT(planMessages);
  const locale = useLocale();
  const [details, setDetails] = useState(false);
  const { totals, incomplete } = nutritionTotals([meal]);
  return <section className="glass mb-3 min-w-0 rounded-card border border-line-soft">
    <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3.5">
      <h2 className="font-display text-[19px] font-semibold">{meal.name}</h2>
      <span className="ms-auto text-xs text-faint">{t('mealTotals', { kcal: formatNumber(Math.round(totals.kcal), locale), protein: formatNumber(Math.round(totals.protein), locale) })}</span>
      {incomplete && <span className="text-xs text-warn">{t('incomplete')}</span>}
      <IconButton type="button" aria-label={t('details')} aria-expanded={details} onClick={() => setDetails(!details)} className="grid min-h-12 min-w-12 place-items-center text-ink"><Ellipsis aria-hidden className="size-4" /></IconButton>
    </div>
    {!meal.items.length && <p className="px-[18px] pb-3 text-xs text-faint">{planT('addTheFirstFood')}</p>}
    <ul className="@container">{meal.items.map(item => <FoodRow key={item.id} item={item} update={update} />)}</ul>
    <FoodSearch meal={meal.name} onPick={(food, grams) => update(draft => addItem(draft, meal.id, food, grams, uuidv7(), planT))} />
    {details && <MealEditor meal={meal} update={update} facts={facts} enhanced day={day} first={first} last={last} hideAdd />}
  </section>;
}

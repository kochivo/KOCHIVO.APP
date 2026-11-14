'use client';
import { Plus } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import type { Meal, PlanDraft } from '../types';
import { mealTotals } from '../totals';
import { V11FoodRow } from './v11-food-row';
import { messages } from './v11/messages';

export function V11Meal({ meal, selected, onSelect, update }: { meal: Meal; selected: boolean; onSelect: () => void; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const t = useT(messages);
  return <section className="glass min-w-0 rounded-card border border-line-soft">
    <div className="flex items-center gap-3 px-5 py-4"><h2 className="font-semibold">{meal.name}</h2><span className="ms-auto text-xs text-muted">{t('calories', { n: Math.round(mealTotals(meal).kcal) })}</span></div>
    {!meal.items.length && <p className="px-5 pb-3 text-xs text-muted">{t('empty')}</p>}
    <ul>{meal.items.map(item => <V11FoodRow key={item.id} item={item} update={update} />)}</ul>
    <button type="button" aria-pressed={selected} onClick={onSelect} className="flex min-h-12 w-full items-center justify-center gap-2 border-t border-dashed border-line text-sm text-muted"><Plus aria-hidden className="size-4" />{t('add')}{selected && <span className="text-lime"> · {t('selected')}</span>}</button>
  </section>;
}

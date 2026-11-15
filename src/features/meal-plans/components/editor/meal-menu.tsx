'use client';
import { clickableClass, Button } from '@/ui/button';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import { useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useT } from '@/core/i18n/client';

import { uuidv7 } from '@/core/offline/ids';
import { moveVisibleMeal } from '../../editor-rules';
import { removeMeal } from '../../draft';
import type { Meal, PlanDraft } from '../../types';
import { messages } from './redesign/messages';
import { messages as planMessages } from '../../messages';

export function MealMenu({ meal, day, update, rename }: { meal: Meal; day: 'training' | 'rest'; update: (change: (draft: PlanDraft) => PlanDraft) => void; rename: () => void }) {
  const t = useT(messages), pt = useT(planMessages), ref = useRef<HTMLDetailsElement>(null);
  const action = (change: (draft: PlanDraft) => PlanDraft) => { update(change); if (ref.current) ref.current.open = false; };
  return <details ref={ref} className="group relative"><summary aria-label={t('menu')} className={`${clickableClass} press flex min-h-12 min-w-12 cursor-pointer list-none items-center justify-center rounded-control border border-line bg-surface focus-visible:ring-2 focus-visible:ring-lime`}><MoreHorizontal aria-hidden className="size-5" /><DisclosureChevron className="size-4" /></summary>
    <div className="sheet absolute end-0 z-20 grid w-56 gap-2 rounded-card border border-line p-3 shadow-xl">
      <Button variant="secondary" onClick={() => { rename(); if (ref.current) ref.current.open = false; }}>{t('rename')}</Button>
      <Button variant="secondary" onClick={() => action(draft => ({ ...draft, meals: [...draft.meals, { ...meal, id: uuidv7(), items: meal.items.map(item => ({ ...item, id: uuidv7(), alternatives: item.alternatives.map(alt => ({ ...alt, id: uuidv7() })) })) }].map((row, index) => ({ ...row, position: index + 1 })) }))}>{t('duplicate')}</Button>
      <Button variant="secondary" onClick={() => action(draft => moveVisibleMeal(draft, meal.id, -1, day))}>{pt('moveMealUp')}</Button>
      <Button variant="secondary" onClick={() => action(draft => moveVisibleMeal(draft, meal.id, 1, day))}>{pt('moveMealDown')}</Button>
      <Button variant="danger" onClick={() => action(draft => removeMeal(draft, meal.id))}>{pt('deleteMeal')}</Button>
    </div>
  </details>;
}

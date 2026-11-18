import type { Translator } from '@/core/i18n/messages';
import { clickableClass } from '@/ui/button';
import { KoPlus } from '@/ui/icons/ko-plus';
import { RefinedMealCard } from '../refined-meal-card';
import type { MealLibraryPlan } from './meal-library-model';
import type { messages } from './messages';

export function MealLibraryGrid({ plans, emptyLibrary, onAssign, onCreate, t }: {
  plans: MealLibraryPlan[];
  emptyLibrary: boolean;
  onAssign: (id: string) => void;
  onCreate: () => void;
  t: Translator<typeof messages>;
}) {
  return <div className="grid gap-card-gap min-[760px]:grid-cols-2 xl:grid-cols-3">
    {!plans.length && <p className="glass col-span-full rounded-card p-card text-muted" role="status">
      {t(emptyLibrary ? 'noPlans' : 'noMatchingPlans')}
    </p>}
    {plans.map(plan => <RefinedMealCard key={plan.id} plan={plan} t={t} onAssign={() => onAssign(plan.id)} />)}
    <button id="meal-library-create-card" type="button" onClick={onCreate}
      className={`${clickableClass} flex min-h-44 flex-col items-center justify-center gap-inline rounded-card border border-dashed border-line p-card text-sm text-muted hover:text-ink ${plans.length ? '' : 'col-span-full'}`}>
      <KoPlus aria-hidden className="size-5" />
      {t('newPlanFromScratchOrTemplate')}
    </button>
  </div>;
}

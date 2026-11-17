import 'server-only';
import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import { planClient } from '../data/client';
import { V11NewPlan } from './v11-new-plan';
import { RefinedMealCard } from './refined-meal-card';
import { messages } from './v11/messages';
import { mealDayType } from '../data/editor-fields';
import { buttonClass } from '@/ui/button';

async function readPlanCards() {
    const client = await planClient();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) throw new Error('Authentication required');
    const captain = auth.data.claims.sub;
    const plans = await client.from('nutrition_plans')
      .select('id,title,target_kcal,target_protein,target_carbs,target_fat,meals(*)')
      .eq('captain_id', captain).eq('is_template', true).neq('status', 'archived').order('created_at', { ascending: false });
    if (plans.error) throw plans.error;
    const usage = new Map<string, Set<string>>();
    for (let start = 0; ; start += 1000) {
      const copies = await client.from('nutrition_plans').select('source_template_id,player_id')
        .eq('captain_id', captain).eq('is_template', false).neq('status', 'archived')
        .order('id').range(start, start + 999);
      if (copies.error) throw copies.error;
      for (const row of copies.data) {
        if (!row.source_template_id || !row.player_id) continue;
        const players = usage.get(row.source_template_id) ?? new Set<string>();
        players.add(row.player_id); usage.set(row.source_template_id, players);
      }
      if (copies.data.length < 1000) break;
    }
    return { plans: plans.data, usage };
}

export async function MealLibraryPage() {
  if (!captainWorkspaceEnabled()) notFound();
  const t = await getT(messages);
  const data = await readPlanCards().catch(() => null);
  if (!data) return <section className="grid gap-card-gap"><V11NewPlan /><p role="alert">{t('error')}</p><Link href="/captain/library/meal-plans" className={buttonClass({ variant: 'secondary', block: false })}>{t('retry')}</Link></section>;
  const { plans, usage } = data;
    return <section className="grid gap-card-gap"><V11NewPlan plans={plans.map(plan => ({ id: plan.id, title: plan.title, calories: plan.target_kcal ?? undefined }))} />
      <div className="grid gap-card-gap min-[760px]:grid-cols-2 xl:grid-cols-3">
        {!plans.length && <p className="glass rounded-card p-card text-muted min-[760px]:col-span-full">{t('noPlans')}</p>}
        {plans.map(plan => <RefinedMealCard key={plan.id} id={plan.id} title={plan.title} kcal={plan.target_kcal}
          protein={plan.target_protein} carbs={plan.target_carbs} fat={plan.target_fat} meals={plan.meals.length} players={usage.get(plan.id)?.size ?? 0}
          split={plan.meals.some(meal => mealDayType(meal) === 'training') && plan.meals.some(meal => mealDayType(meal) === 'rest')} t={t} />)}
      </div>
    </section>;
}

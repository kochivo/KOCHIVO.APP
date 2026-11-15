import 'server-only';
import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import { planClient } from '../data/client';
import { V11NewPlan } from './v11-new-plan';
import { V11Ring } from './v11-ring';
import { messages } from './v11/messages';
import { mealDayType } from '../data/editor-fields';
import { buttonClass } from '@/ui/button';
import { RowChevron } from '@/ui/row-chevron';

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
      <div className="grid gap-card-gap min-[761px]:grid-cols-3">
        {plans.map(plan => <Link key={plan.id} href={`/captain/nutrition/${plan.id}`} className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-[120px] min-w-0 items-center gap-card-gap p-card" })}>
          {plan.target_kcal !== null && <V11Ring small value={String(plan.target_kcal)} />}
          <div className="min-w-0"><b>{plan.title}</b><div className="my-inline flex flex-wrap gap-inline text-xs text-muted">
            {(['protein', 'carbs', 'fat'] as const).map(key => {
              const value = key === 'protein' ? plan.target_protein : key === 'carbs' ? plan.target_carbs : plan.target_fat;
              return value !== null && <span key={key} className="inline-flex items-center gap-inline"><i className={`size-1.5 rounded-full ${key === 'protein' ? 'bg-lime' : key === 'carbs' ? 'bg-calm' : 'bg-warn'}`} />{t(key)} <b>{t('grams', { n: value })}</b></span>;
            })}
          </div><small className="text-muted">{t('usage', { n: usage.get(plan.id)?.size ?? 0 })}{plan.meals.some(meal => mealDayType(meal) === 'training') && plan.meals.some(meal => mealDayType(meal) === 'rest') && <> · {t('split')}</>}</small></div>
          <RowChevron className="ms-auto" />
        </Link>)}
        <V11NewPlan card />
      </div>
    </section>;
}

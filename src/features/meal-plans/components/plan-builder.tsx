'use client';
import Link from 'next/link';
import { uuidv7 } from '@/core/offline/ids';
import { Button } from '@/ui';
import { usePlanDraft } from '../hooks/use-plan-draft';
import { addMeal } from '../draft';
import { planTotals } from '../totals';
import { TargetsBar } from './targets-bar';
import { MealEditor } from './meal-editor';

export function PlanBuilder({ planId }: { planId: string }) {
  const state = usePlanDraft(planId);
  const { draft, update } = state;
  if (state.loading) return <p role="status">جاري تحميل النظام</p>;
  if (!draft) return <div role="alert">{state.error}<Button variant="secondary" onClick={state.reload}>جرّب تاني</Button></div>;
  return <div className="mx-auto grid max-w-6xl gap-5">
    <Link className="inline-flex min-h-12 items-center text-muted" href={`/captain/players/${draft.playerId}/nutrition`}>الأنظمة الغذائية</Link>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <label className="grid gap-2"><span className="text-sm text-muted">اسم النظام</span>
        <input aria-label="اسم النظام" disabled={state.busy} maxLength={80} value={draft.title} onChange={event => update(d => ({ ...d, title: event.target.value }))}
          className="min-h-12 rounded-control border border-line bg-surface px-4 text-2xl font-bold" /></label>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={state.busy} onClick={() => void state.persist()}>احفظ النظام</Button>
        <Button disabled={state.busy} onClick={() => void state.persist(true)}>فعّل للاعب</Button>
      </div>
    </header>
    {state.busy && <p role="status">جاري الحفظ</p>}
    {state.dirty && <p className="text-warn">فيه تعديلات لسه متحفظتش</p>}
    {state.error && <div role="alert" className="text-danger">{state.error}<Button variant="secondary" onClick={() => void state.retrySave()}>جرّب تاني</Button></div>}
    {state.message && <p role="status">{state.message}</p>}
    <fieldset disabled={state.busy} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
      <section aria-label="الوجبات" className="grid content-start gap-4">
        {!draft.meals.length && <p className="glass rounded-card p-6">ضيف أول وجبة وابدأ النظام</p>}
        {draft.meals.map((meal, index) => <MealEditor key={meal.id} meal={meal} first={index === 0} last={index === draft.meals.length - 1} update={update} />)}
        <Button variant="secondary" onClick={() => { const id = uuidv7(); update(d => addMeal(d, 'وجبة جديدة', id)); }}>ضيف وجبة</Button>
      </section>
      <aside><TargetsBar targets={draft.targets} totals={planTotals(draft)} onChange={targets => update(d => ({ ...d, targets }))} /></aside>
    </fieldset>
  </div>;
}

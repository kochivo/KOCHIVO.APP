'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Utensils } from 'lucide-react';
import { localDb, type MealLogRow, type NutritionMeal } from '@/core/offline';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { Button, EmptyState, GlassCard } from '@/ui';
import { setMealEaten } from '../data/log-meal';
import { mealMacros } from '../macros';
import { formatPortion } from '../format-portion';
import { starterText } from '@/lib/starter-text';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';
import { messages as v4Messages } from '../player-v4/messages';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
import dynamic from 'next/dynamic';
const MealBudget = dynamic(() => import('./meal-budget').then(module => module.MealBudget));

export function MealCard({ meal, log, today, planTitle, primary = false }: { meal: NutritionMeal; log?: MealLogRow; today: string; planTitle?: string; primary?: boolean }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v4t = useT(v4Messages);
  const locale = useLocale();
  const success = useT(successMessages), toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const swaps = log?.swaps ?? {};
  const eaten = Boolean(log?.completed_at && !log.deleted_at && log.log_date === today);
  const macros = mealMacros(meal, swaps);
  async function save(nextEaten: boolean, nextSwaps: Record<string, string>, now: number) {
    setBusy(true);
    setError(false);
    try {
      await setMealEaten(localDb(), { mealId: meal.id, meal, logDate: today, eaten: nextEaten, swaps: nextSwaps }, now);
      return true;
    } catch { setError(true); return false; }
    finally { setBusy(false); }
  }
  function swap(itemId: string, now: number) {
    const item = meal.items.find((entry) => entry.id === itemId);
    if (!item) return;
    const current = item.alternatives.findIndex((alt) => alt.id === swaps[itemId]);
    const next = item.alternatives[current + 1];
    const nextSwaps = { ...swaps };
    if (next) nextSwaps[itemId] = next.id;
    else delete nextSwaps[itemId];
    void save(eaten, nextSwaps, now).then(ok => {
      if (ok) { const chosen = next ?? item;
        toast.success({ title: success('swapped'), detail: success('detail', { name: chosen.name, grams: formatNumber(chosen.grams, locale) }), icon: 'meal' }); }
    });
  }
  const v6 = captainWorkspaceEnabled();
  const details = <GlassCard className="space-y-card-gap p-card">
    <h2 className="text-lg font-bold">{starterText(meal.name, locale, planTitle)}</h2>
    <MealBudget meal={meal} swaps={swaps} />
    {meal.time_of_day && <time className="text-xs text-muted" dateTime={meal.time_of_day}><bdi>{meal.time_of_day.slice(0, 5)}</bdi></time>}
    {meal.items.length === 0 && <EmptyState icon={Utensils} title={t('thisMealIsBeingPrepared')} body={t('itWillAppearHereWhenReady')} action={{ label: t('messageCoach'), href: '/player/captain' }} />}
    <ul className="space-y-stack">
      {meal.items.map((item) => {
        const chosen = item.alternatives.find((alt) => alt.id === swaps[item.id]) ?? item;
        return <li key={item.id} className="flex min-h-14 items-center gap-stack border-t border-line-soft py-stack">
          {chosen.photo_path ? <Image src={foodPhotoUrl(chosen.photo_path)} alt={chosen.name} width={60} height={60}
            unoptimized className="size-15 shrink-0 rounded-control object-cover" /> :
            <span aria-hidden="true" className="glass flex size-15 shrink-0 items-center justify-center rounded-control text-muted">{chosen.name.charAt(0)}</span>}
          <span className="min-w-0 flex-1 text-sm font-bold">{chosen.name} · {formatPortion(chosen, locale, t('g'))}</span>
          {item.alternatives.length > 0 && <Button className="min-h-12" variant={v6 ? 'secondary' : 'ghost'} disabled={busy}
            aria-label={t('swapFood', { value0: chosen.name })} onClick={() => swap(item.id, Date.now())}>{t('swap')}</Button>}
        </li>;
      })}
    </ul>
    <p className="text-start text-xs text-muted"><bdi>{t('macroSummary', { protein: formatNumber(macros.protein, locale), carbs: formatNumber(macros.carbs, locale), fat: formatNumber(macros.fat, locale) })}</bdi></p>
    {!v6 && <Button size="lg" className="w-full" variant={v6 ? 'secondary' : !meal.items.length ? 'secondary' : eaten ? 'ghost' : 'primary'} aria-pressed={eaten}
      disabled={busy || !meal.items.length} onClick={() => void save(!eaten, swaps, Date.now())}>
      {eaten && <Check aria-hidden="true" className="size-5" />}{t('mealEaten')}
    </Button>}
    {!v6 && error && <p role="alert" className="text-sm text-danger">{t('saveFailedTryAgain')}</p>}
  </GlassCard>;
  if (!v6) return details;
  const name = starterText(meal.name, locale, planTitle);
  const featuredAction = primary && !eaten;
  return <article className={`glass rounded-card px-card py-stack ${primary && !eaten ? 'border-lime/30' : ''}`}>
    <div className="flex items-center gap-stack">
      {featuredAction ? <span aria-hidden className="grid size-12 shrink-0 place-items-center"><span className="size-8 rounded-control border border-line" /></span> :
        <button type="button" disabled={busy || (!eaten && !meal.items.length)} aria-pressed={eaten} aria-label={v6t('eatMeal', { meal: name })}
          onClick={() => void save(!eaten, swaps, Date.now())}
          className="press grid size-12 shrink-0 place-items-center rounded-control disabled:opacity-50">
          {eaten ? <span aria-hidden className="grid size-8 place-items-center rounded-control bg-lime text-on-lime"><Check className="size-4" strokeWidth={3} /></span>
            : <span aria-hidden className="size-8 rounded-control border border-line" />}
        </button>}
      <button type="button" aria-label={`${name} · ${v6t('details')}`} aria-expanded={open} onClick={() => setOpen(value => !value)}
        className="press flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-control font-sans text-start">
        <span className="text-md font-bold">{name}</span>
        {meal.time_of_day && <time className="text-xs text-muted" dateTime={meal.time_of_day}><bdi>{meal.time_of_day.slice(0, 5)}</bdi></time>}
      </button>
      <p className="shrink-0 text-micro text-muted"><bdi className="font-display text-md font-extrabold tabular-nums text-ink">{formatNumber(macros.kcal, locale)}</bdi> {t('kcal')}</p>
    </div>
    <p className="text-xs text-muted">{meal.items.length ? meal.items.map(item => {
          const chosen = item.alternatives.find(alt => alt.id === swaps[item.id]) ?? item;
          return `${chosen.name} ${formatPortion(chosen, locale, t('g'))}`;
    }).join(' · ') : t('thisMealIsBeingPrepared')}</p>
    {!open && <MealBudget meal={meal} swaps={swaps} />}
    {featuredAction && <div className="mt-stack flex flex-wrap gap-inline">
      {meal.items.some(item => item.alternatives.length > 0) && <Button type="button" aria-expanded={open} variant="secondary" onClick={() => setOpen(value => !value)}>{v4t('swap')}</Button>}
      <Button type="button" block={false} className="min-w-0 flex-1" disabled={busy || !meal.items.length} onClick={() => void save(true, swaps, Date.now())}><Check aria-hidden className="size-5" />{t('mealEaten')}</Button>
    </div>}
    {error && <p role="alert" className="text-sm text-danger">{t('saveFailedTryAgain')}</p>}
    {open && <div className="mt-stack">{details}</div>}
  </article>;
}

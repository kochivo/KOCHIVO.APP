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
import { starterText } from '@/lib/starter-text';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';

export function MealCard({ meal, log, today, planTitle, primary = false }: { meal: NutritionMeal; log?: MealLogRow; today: string; planTitle?: string; primary?: boolean }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const locale = useLocale();
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
      await setMealEaten(localDb(), { mealId: meal.id, logDate: today, eaten: nextEaten, swaps: nextSwaps }, now);
    } catch { setError(true); }
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
    void save(eaten, nextSwaps, now);
  }
  const v6 = captainWorkspaceEnabled();
  const details = <GlassCard className="space-y-4 p-4">
    <h2 className="text-lg font-bold">{starterText(meal.name, locale, planTitle)}</h2>
    {meal.items.length === 0 && <EmptyState icon={Utensils} title={t('thisMealIsBeingPrepared')} body={t('itWillAppearHereWhenReady')} action={{ label: t('messageCoach'), href: '/player/captain' }} />}
    <ul className="space-y-3">
      {meal.items.map((item) => {
        const chosen = item.alternatives.find((alt) => alt.id === swaps[item.id]) ?? item;
        return <li key={item.id} className="flex items-center gap-3">
          {chosen.photo_path ? <Image src={foodPhotoUrl(chosen.photo_path)} alt={chosen.name} width={60} height={60}
            unoptimized className="size-15 shrink-0 rounded-control object-cover" /> :
            <span aria-hidden="true" className="glass flex size-15 shrink-0 items-center justify-center rounded-control text-muted">{chosen.name.charAt(0)}</span>}
          <span className="min-w-0 flex-1 text-sm font-bold">{chosen.name} · {formatNumber(chosen.grams, locale)}{t('g')}</span>
          {item.alternatives.length > 0 && <Button className="min-h-12" variant={v6 ? 'secondary' : 'ghost'} disabled={busy}
            aria-label={t('swapFood', { value0: chosen.name })} onClick={() => swap(item.id, Date.now())}>{t('swap')}</Button>}
        </li>;
      })}
    </ul>
    <p className="text-start text-xs text-muted"><bdi>{t('macroSummary', { protein: formatNumber(macros.protein, locale), carbs: formatNumber(macros.carbs, locale), fat: formatNumber(macros.fat, locale) })}</bdi></p>
    <Button size="lg" className="w-full" variant={v6 ? 'secondary' : !meal.items.length ? 'secondary' : eaten ? 'ghost' : 'primary'} aria-pressed={eaten}
      disabled={busy || !meal.items.length} onClick={() => void save(!eaten, swaps, Date.now())}>
      {eaten && <Check aria-hidden="true" className="size-5" />}{t('mealEaten')}
    </Button>
    {error && <p role="alert" className="text-sm text-danger">{t('saveFailedTryAgain')}</p>}
  </GlassCard>;
  if (!v6) return details;
  const name = starterText(meal.name, locale, planTitle);
  return <div className={`rounded-[22px] border bg-surface px-3 py-2.5 ${primary && !eaten ? 'border-lime/50' : 'border-line-soft'}`}>
    <div className="flex items-center gap-3">
      {eaten ? <span role="img" aria-label={v6t('eaten')} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-lime text-on-lime">
        <Check aria-hidden className="size-[22px]" strokeWidth={3} />
      </span> : <button type="button" disabled={busy || !meal.items.length} aria-label={v6t('eatMeal', { meal: name })}
        onClick={() => void save(true, swaps, Date.now())}
        className={`size-12 shrink-0 rounded-full border-2 bg-transparent disabled:opacity-50 ${primary ? 'border-lime' : 'border-line'}`} />}
      <button type="button" aria-label={v6t('details')} aria-expanded={open} onClick={() => setOpen(value => !value)}
        className="flex min-h-12 min-w-0 flex-1 flex-col justify-center gap-0.5 font-sans text-start">
        <span className="text-[15px] font-bold">{name} {primary && !eaten && <span className="text-xs font-bold text-lime">{v6t('now')}</span>}</span>
        <span className="w-full truncate text-xs text-muted">{meal.items.length ? meal.items.map(item => {
          const chosen = item.alternatives.find(alt => alt.id === swaps[item.id]) ?? item;
          return `${chosen.name} ${formatNumber(chosen.grams, locale)}${t('g')}`;
        }).join(' · ') : t('thisMealIsBeingPrepared')}</span>
      </button>
    </div>
    {error && <p role="alert" className="text-sm text-danger">{t('saveFailedTryAgain')}</p>}
    {open && <div className="mt-3">{details}</div>}
  </div>;
}

'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { useState } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { localDb, type MealLogRow, type NutritionMeal } from '@/core/offline';
import { foodMediaUrl } from '@/core/storage';
import { Button, GlassCard } from '@/ui';
import { setMealEaten } from '../data/log-meal';
import { mealMacros } from '../macros';
import { starterText } from '@/lib/starter-text';

export function MealCard({ meal, log, today, planTitle }: { meal: NutritionMeal; log?: MealLogRow; today: string; planTitle?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const swaps = log?.swaps ?? {};
  const eaten = Boolean(log?.completed_at);
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
  return <GlassCard className="space-y-4 p-4">
    <h2 className="text-lg font-bold">{starterText(meal.name, locale, planTitle)}</h2>
    {meal.items.length === 0 && <p className="text-sm text-muted">{t('thisMealIsBeingPrepared')}</p>}
    <ul className="space-y-3">
      {meal.items.map((item) => {
        const chosen = item.alternatives.find((alt) => alt.id === swaps[item.id]) ?? item;
        return <li key={item.id} className="flex items-center gap-3">
          {chosen.photo_path ? <Image src={foodMediaUrl(chosen.photo_path)} alt={chosen.name} width={60} height={60}
            unoptimized className="size-15 shrink-0 rounded-control object-cover" /> :
            <span aria-hidden="true" className="glass flex size-15 shrink-0 items-center justify-center rounded-control text-muted">{chosen.name.charAt(0)}</span>}
          <span className="min-w-0 flex-1 text-sm font-bold">{chosen.name} · {formatNumber(chosen.grams, locale)}{t('g')}</span>
          {item.alternatives.length > 0 && <Button className="min-h-12" variant="ghost" disabled={busy}
            aria-label={t('swapFood', { value0: chosen.name })} onClick={() => swap(item.id, Date.now())}>{t('swap')}</Button>}
        </li>;
      })}
    </ul>
    <p className="text-start text-xs text-muted"><bdi>{t('macroSummary', { protein: formatNumber(macros.protein, locale), carbs: formatNumber(macros.carbs, locale), fat: formatNumber(macros.fat, locale) })}</bdi></p>
    <Button size="lg" className="w-full" variant={eaten ? 'ghost' : 'primary'} aria-pressed={eaten}
      disabled={busy || !meal.items.length} onClick={() => void save(!eaten, swaps, Date.now())}>
      {eaten && <Check aria-hidden="true" className="size-5" />}{t('mealEaten')}
    </Button>
    {error && <p role="alert" className="text-sm text-danger">{t('saveFailedTryAgain')}</p>}
  </GlassCard>;
}

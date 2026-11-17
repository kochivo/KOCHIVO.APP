'use client';
import { NumberInput } from '@/ui/number-input';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { macrosFor } from '@/lib/macros';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import type { Food } from '../../types';
import { ingredientNames } from '../../data/ingredient-names';
import { messages } from './v2/messages';
import { messages as baseMessages } from './messages';
import { foodStatus } from './library-model';
import { FoodBadge } from './food-badge';

export function FoodFacts({ food, onAdd }: { food: Food; onAdd?: (food: Food, grams: number) => void }) {
  const t = useT(messages), bt = useT(baseMessages), locale = useLocale();
  const [grams, setGrams] = useState(100);
  const values = macrosFor(food, grams);
  const ref = food.source_ref;
  const status = foodStatus(food);
  return <section className="grid gap-card-gap">
    <div className="flex items-center gap-stack">
      <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-control bg-surface-raised">
        {/* Public food storage uses the shared URL resolver. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {food.photo && <img src={foodPhotoUrl(food.photo)} alt="" width={96} height={96} className="size-24 object-cover" />}
      </div><div><h3 className="text-title font-bold">{food.name}</h3><p className="text-sm text-muted">{food.nameEn}</p><FoodBadge food={food} /><p className="text-xs text-muted">{t(food.state ?? 'unknownState')}</p></div>
    </div>
    <label className="grid gap-inline">{t('grams')}<NumberInput className="min-h-12 w-full rounded-control border border-line bg-surface px-stack" min={1} max={10000} value={grams} onCommit={value => setGrams(Math.max(1, Math.min(10000, value || 1)))} /></label>
    <div className="flex flex-wrap items-center gap-inline"><IconButton aria-label={t('minus')} onClick={() => setGrams(value => Math.max(1, value - 10))}><Minus aria-hidden /></IconButton><IconButton aria-label={t('plus')} onClick={() => setGrams(value => Math.min(10000, value + 10))}><Plus aria-hidden /></IconButton>
      {food.units?.map(unit => <Button key={unit.key} variant="secondary" onClick={() => setGrams(unit.grams)}>{t('serving', { name: locale === 'en' ? unit.name_en : unit.name_ar, grams: unit.grams })}</Button>)}
    </div>
    <dl className="glass-strong grid grid-cols-4 gap-stack rounded-control p-card">{(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <div key={key}><dt className="text-xs text-muted">{bt(key)}</dt><dd className="font-display text-title tabular-nums">{Math.round(values[key] * 10) / 10}</dd></div>)}</dl>
    <h3 className="font-semibold">{t('per100')}</h3><dl className="grid gap-inline">{([
      ['kcal', food.kcal], ['protein', food.protein], ['carbs', food.carbs], ['fat', food.fat],
      ['fiber', food.fiber_per_100g], ['sugar', food.sugar_per_100g], ['sodium', food.sodium_mg_per_100g],
    ] as const).map(([key, value]) => <div key={key} className="flex justify-between gap-stack border-b border-line-soft py-inline"><dt>{key === 'fiber' || key === 'sugar' || key === 'sodium' ? t(key) : bt(key)}</dt><dd className="text-muted">{value == null ? t('missing') : value}</dd></div>)}</dl>
    <section className="recessed grid gap-inline rounded-control p-card"><h3 className="font-semibold">{t('source')}</h3><p>{t(status)}</p>
      {ref && 'fdc_id' in ref && <><p dir="ltr">{ref.fdc_id} · {ref.dataset}</p>{locale === 'en' && <p>{ref.description}</p>}</>}
      {ref && 'ingredients' in ref && <><h4>{t('ingredients')} · {ref.ingredients.length}</h4><ul>{ref.ingredients.map((item, index) => <li key={`${item.fdc_id}-${index}`}>{'food_id' in item && item.food_id ? item.description : ingredientNames[item.fdc_id]?.[locale === 'en' ? 'en' : 'ar'] ?? item.description} · {item.grams} {bt('grams')}</li>)}</ul></>}
      <p className="text-xs text-muted">{t(`${status}Confidence`)}</p>
    </section>
    {onAdd && <Button className="sticky bottom-0" onClick={() => onAdd(food, grams)}>{t('add')}</Button>}
  </section>;
}

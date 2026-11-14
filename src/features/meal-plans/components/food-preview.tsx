'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { foodFormMessages, messages } from '../messages';
import type { Macros } from '@/lib/macros';
import type { FoodUnit } from '../types';

export function FoodPreview({ name, nameEn, macros, units, photo }: {
  name: string; nameEn: string; macros: Macros; units: FoodUnit[]; photo?: string | null;
}) {
  const t = useT(foodFormMessages);
  const planT = useT(messages);
  const locale = useLocale();
  const unit = units[0];
  const grams = unit?.grams ?? 100;
  const portions = { kcal: macros.kcal * grams / 100, protein: macros.protein * grams / 100,
    carbs: macros.carbs * grams / 100, fat: macros.fat * grams / 100 };
  const energies = [macros.protein * 4, macros.carbs * 4, macros.fat * 9];
  const total = energies.reduce((sum, value) => sum + value, 0);
  const labels = ['protein', 'carbs2', 'fat2'] as const;
  const colors = ['bg-lime', 'bg-calm', 'bg-warn'];
  const macroLabels = { kcal: 'calories', protein: 'protein', carbs: 'carbs2', fat: 'fat2' } as const;
  return <aside className="glass-strong grid gap-4 self-start rounded-card p-5 lg:sticky lg:top-5">
    <h2 className="font-bold">{t('preview')}</h2>
    {/* The food image uses the existing public bucket or a temporary local object URL. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo && <img src={photo} alt={name} width={160} height={160} className="mx-auto size-40 rounded-card object-cover" />}
    <h3 className="text-center text-xl font-bold">{(locale === 'en' ? nameEn || name : name) || planT('foodName')}</h3>
    <p className="text-center text-sm text-muted">{unit ? t('portion', { name: locale === 'en' ? unit.name_en || unit.name_ar : unit.name_ar, grams }) : t('grams100')}</p>
    <div className="flex h-2 overflow-hidden rounded-full bg-surface" role="img" aria-label={planT('servingMacros')}>
      {energies.map((value, index) => <span key={labels[index]} className={colors[index]} style={{ width: `${total ? value / total * 100 : 0}%` }} />)}
    </div>
    <dl className="grid grid-cols-2 gap-3">{(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <div key={key}>
      <dt className="text-sm text-muted">{planT(macroLabels[key])}</dt>
      <dd className="font-display text-2xl tabular-nums">{Math.round(portions[key] * 10) / 10}</dd>
    </div>)}</dl>
  </aside>;
}

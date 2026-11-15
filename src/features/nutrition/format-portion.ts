import type { NutritionFood } from '@/core/offline';
import type { Locale } from '@/core/i18n';
import { formatNumber } from '@/lib/format';

export function formatPortion(food: NutritionFood, locale: Locale, gramsLabel: string): string {
  const grams = `${formatNumber(food.grams, locale)}${gramsLabel}`;
  const unit = food.units?.find(unit => unit.key === food.unit && Number.isFinite(unit.grams) && unit.grams > 0);
  if (!unit) return grams;
  const amount = Math.round(food.grams / unit.grams * 100) / 100;
  return `${formatNumber(amount, locale)} ${locale === 'en' ? unit.name_en : unit.name_ar} (${grams})`;
}

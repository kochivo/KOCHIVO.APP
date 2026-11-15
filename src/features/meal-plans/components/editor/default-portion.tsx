import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { macrosFor } from '@/lib/macros';
import { defaultPortion } from '../../data/meal-portions';
import type { Food } from '../../types';
import { messages } from '../v11/messages';
import { messages as portionMessages } from './redesign/messages';

export function DefaultPortion({ food }: { food: Food }) {
  const locale = useLocale(), t = useT(messages), pt = useT(portionMessages);
  const portion = defaultPortion(food), values = macrosFor(food, portion.grams);
  const unit = food.units?.find(unit => unit.key === portion.unit);
  return <small className="block text-xs text-muted">{unit ? locale === 'en' ? unit.name_en : unit.name_ar : `${formatNumber(portion.grams, locale)} ${pt('grams')}`} · {t('calories', { n: formatNumber(values.kcal, locale) })} · {t('protein')} {formatNumber(values.protein, locale)}</small>;
}

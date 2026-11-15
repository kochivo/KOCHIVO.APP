'use client';
import { useCallback } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { formatNumber } from '@/lib/format';
import { loadFoodPrices } from '../data/food-prices';
import { FoodPriceRow } from './food-price-row';
import { messages } from '../budget/messages';

export function FoodPrices({ platform }: { platform: boolean }) {
  const t = useT(messages), locale = useLocale(), loader = useCallback(() => loadFoodPrices(), []);
  const resource = useResource(`food-prices:${platform}`, loader);
  if (!resource.data) return resource.error ? <div role="alert">{t('error')}<Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div> : <LoadingState />;
  const name = (food: typeof resource.data.foods[number]) => locale === 'en' ? food.name_en || food.name_ar : food.name_ar;
  if (platform) return <table className="w-full text-start"><thead><tr>
    <th scope="col" className="p-stack text-start">{t('food')}</th><th scope="col" className="p-stack text-start">{t('prices')}</th>
  </tr></thead><tbody>{!resource.data.foods.length ? <tr><td colSpan={2}>{t('empty')}</td></tr> : resource.data.foods.map(food => <tr key={food.id} className="border-t border-line">
    <th scope="row" className="p-stack text-start align-top">{name(food)}</th><td className="p-stack"><FoodPriceRow foodId={food.id} initial={food.platform} platform onSaved={() => void resource.retry()} /></td>
  </tr>)}</tbody></table>;
  return <div className="space-y-stack">
    {!resource.data.foods.length ? <p>{t('empty')}</p> : <ul className="space-y-stack">{resource.data.foods.map(food => <li key={food.id} className="rounded-control border border-line p-stack">
      <p className="font-semibold">{name(food)}</p>
      {food.platform && <p className="text-sm text-muted">{t('platform')}: <bdi>{t('money', { n: formatNumber(food.platform.price_egp, locale) })} / {t(food.platform.unit)}</bdi></p>}
      <FoodPriceRow foodId={food.id} initial={food.override ?? food.platform} platform={false} onSaved={() => void resource.retry()} />
    </li>)}</ul>}
  </div>;
}

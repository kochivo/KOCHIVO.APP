'use client';
import { useCallback } from 'react';
import { useResource } from '@/core/resource';

export function useFoodPrices(enabled = true) {
  const loader = useCallback(async () => {
    const { loadFoodPrices } = await import('../data/food-prices');
    return loadFoodPrices();
  }, []);
  return useResource(enabled ? 'food-budget:player' : null, loader);
}

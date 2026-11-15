'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../budget/messages';
const FoodPrices = dynamic(() => import('./food-prices').then(m => m.FoodPrices), { loading: () => <LoadingState /> });
export function FoodPricesEntry({ platform = false }: { platform?: boolean }) {
  const [open, setOpen] = useState(false), t = useT(messages);
  return <section className="glass space-y-stack rounded-card p-card">
    <Button variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{t('prices')}</Button>
    {open && <FoodPrices platform={platform} />}
  </section>;
}

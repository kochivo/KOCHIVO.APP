'use client';
import { useCallback, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { loadFoodPrices, saveMonthlyFoodBudget } from '../data/food-prices';
import { BudgetField } from './budget-field';
import { messages } from '../budget/messages';
import { useToast } from '@/ui/toast';

export function PlayerBudget() {
  const t = useT(messages), loader = useCallback(() => loadFoodPrices(), []);
  const toast = useToast();
  const resource = useResource('food-budget:player', loader);
  const [edit, setEdit] = useState<{ value: number | null }>();
  const [busy, setBusy] = useState(false), [error, setError] = useState(false), [saved, setSaved] = useState(false);
  const value = edit ? edit.value : resource.data?.monthly ?? null;
  if (!resource.data) return resource.error ? <div role="alert">{t('error')}<Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div> : <LoadingState />;
  return <section className="glass space-y-stack rounded-card p-card">
    <BudgetField value={value} timezone={resource.data.timezone} onChange={value => { setEdit({ value }); setSaved(false); }} />
    <Button variant="secondary" disabled={busy || (value !== null && (!Number.isInteger(value) || value < 300 || value > 100000))} onClick={async () => {
      setBusy(true); setError(false);
      try { await saveMonthlyFoodBudget(value); setSaved(true); toast.success({ title: t('saved'), detail: t('monthly'), icon: 'meal' }); await resource.retry(); }
      catch { setError(true); } finally { setBusy(false); }
    }}>{t('save')}</Button>
    {saved && <p role="status">{t('saved')}</p>}{error && <p role="alert" className="text-danger">{t('error')}</p>}
  </section>;
}

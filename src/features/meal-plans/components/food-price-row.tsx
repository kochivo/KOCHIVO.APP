'use client';
import { NumberInput } from '@/ui/number-input';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { saveFoodPrice } from '../data/food-prices';
import { messages } from '../budget/messages';
import { useToast } from '@/ui/toast';

export function FoodPriceRow({ foodId, initial, platform, onSaved }: { foodId: string; platform: boolean; onSaved?: () => void;
  initial?: { unit: 'kg' | 'piece' | 'pack'; unit_grams: number; price_egp: number; updated_at: string } }) {
  const t = useT(messages);
  const toast = useToast();
  const [unit, setUnit] = useState(initial?.unit ?? 'kg'), [grams, setGrams] = useState(initial?.unit_grams ?? 1000);
  const [price, setPrice] = useState(initial?.price_egp ?? 0), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);
  return <form className="space-y-stack" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setStatus(null);
    try { await saveFoodPrice({ food_id: foodId, unit, unit_grams: grams, price_egp: price }, platform); setStatus('saved'); onSaved?.();
      toast.success({ title: t('saved'), detail: t('prices'), icon: 'meal' }); }
    catch { setStatus('error'); } finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="grid gap-stack min-[760px]:grid-cols-3">
      <label className="text-sm">{t('unit')}<select className="min-h-12 w-full rounded-control bg-surface px-stack" value={unit} onChange={event => {
        const next = event.target.value as typeof unit; setUnit(next); if (next === 'kg') setGrams(1000);
      }}>{(['kg', 'piece', 'pack'] as const).map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>
      <NumberInput label={t('grams')} min={1} max={100000} value={grams} disabled={unit === 'kg'} onCommit={value => setGrams(value)} />
      <NumberInput label={t(platform ? 'price' : 'yours')} min={0.01} step={0.01} value={price} onCommit={value => setPrice(value)} />
    </fieldset>
    {initial && <p className="text-xs text-muted">{t('updated')}: <time dateTime={initial.updated_at}><bdi>{initial.updated_at.slice(0, 10)}</bdi></time></p>}
    <Button type="submit" variant="secondary" disabled={busy || price <= 0 || grams <= 0}>{t('save')}</Button>
    {status && <p role={status === 'error' ? 'alert' : 'status'}>{t(status)}</p>}
  </form>;
}

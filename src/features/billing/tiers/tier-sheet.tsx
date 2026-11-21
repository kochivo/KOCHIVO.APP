'use client';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { TextField } from '@/ui/text-field';
import { Button } from '@/ui/button';
import { saveTier } from '../data/catalog-actions';
import { saveCatalogPackage } from '../data/catalog-package';
import { durationLabel } from '../package-choice';
import { messages } from './messages';
import { messages as billingMessages } from '../messages';
import type { ActionResult } from '../types';
import type { Tier } from './types';
import type { useCatalog } from './use-catalog';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';

export function TierSheet({ tier, catalog, onClose }: { tier?: Tier; catalog: ReturnType<typeof useCatalog>; onClose: () => void }) {
  const t = useT(messages), billing = useT(billingMessages), locale = useLocale();
  const success = useT(successMessages), toast = useToast();
  const [name, setName] = useState(tier?.name ?? ''), [description, setDescription] = useState(tier?.description ?? '');
  const [features, setFeatures] = useState(tier?.features.join('\n') ?? ''), [color, setColor] = useState(tier?.color ?? 'muted');
  const [price, setPrice] = useState(''), [days, setDays] = useState('30');
  const [error, setError] = useState('');
  async function save() {
    const list = features.split('\n').map(value => value.trim()).filter(Boolean);
    if (!name.trim() || list.length > 10 || list.some(value => value.length > 80)) { setError(t('invalid')); return; }
    // A new tier is created together with its first duration: price and days are required.
    const priceValue = Number(price), daysValue = Number(days);
    if (!tier && (!Number.isInteger(priceValue) || priceValue < 0 || priceValue > 100000
      || !Number.isInteger(daysValue) || daysValue < 1 || daysValue > 365)) { setError(t('invalid')); return; }
    const fields = { name: name.trim(), description, features: list, color, position: tier?.position ?? Math.max(-1, ...(catalog.data?.tiers.map(row => row.position) ?? [])) + 1, is_featured: tier?.is_featured ?? false };
    const newId = tier ? undefined : uuidv7();
    const optimistic: Tier = { ...fields, id: tier?.id ?? newId as string, captain_id: tier?.captain_id ?? '', archived_at: null, created_at: tier?.created_at ?? '' };
    const durationName = !tier ? durationLabel(daysValue, t, locale) : '';
    const optimisticPackage = !tier && newId ? { id: uuidv7(), name: durationName, price_egp: priceValue, days: daysValue, kind: 'days' as const, sessions: null, tier_id: newId, max_freeze_days: null } : null;
    if (await catalog.change(current => ({ ...current,
      tiers: tier ? current.tiers.map(row => row.id === tier.id ? optimistic : row) : [...current.tiers, optimistic],
      packages: optimisticPackage ? [...current.packages, optimisticPackage] : current.packages }),
      async (): Promise<ActionResult<true>> => {
        const saved = await saveTier({ ...fields, ...(tier ? { id: tier.id } : { newId }) });
        if (saved.error !== undefined) return { error: saved.error };
        if (!optimisticPackage || !newId) return { data: true };
        const packageResult = await saveCatalogPackage({ name: durationName, price: priceValue, days: daysValue, kind: 'days', sessions: null, tier_id: newId });
        return packageResult.error !== undefined ? { error: packageResult.error } : { data: true };
      })) {
      toast.success({ title: success('packageSaved'), detail: success('packageName', { name: fields.name }), icon: 'payment' }); onClose();
    }
  }
  return <ResponsiveDialog modal fallbackId="catalog-heading" onDismiss={() => { if (!catalog.busy) onClose(); }} aria-labelledby="tier-title"
    className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-card text-ink backdrop:bg-bg-deep/80">
    <form className="space-y-card-gap" onSubmit={event => { event.preventDefault(); void save(); }}>
      <h2 id="tier-title" className="font-display text-title">{t(tier ? 'editFeatures' : 'newTier')}</h2>
      <TextField label={t('name')} required maxLength={40} value={name} onChange={event => setName(event.target.value)} />
      <TextField label={t('description')} maxLength={80} value={description} onChange={event => setDescription(event.target.value)} />
      <label className="block text-xs text-faint">{t('features')}<textarea className="mt-inline min-h-36 w-full rounded-control border border-line bg-surface p-stack text-ink" value={features} onChange={event => setFeatures(event.target.value)} /></label>
      <label className="block text-xs text-faint">{t('color')}<select value={color} onChange={event => setColor(event.target.value)} className="mt-inline min-h-12 w-full rounded-control border border-line bg-surface px-stack text-ink">
        {(['muted', 'lime', 'warn', 'danger'] as const).map(value => <option key={value} value={value}>{t(value)}</option>)}
      </select></label>
      {!tier && <div className="flex gap-inline">
        <div className="flex-1"><TextField label={billing('packagePrice')} type="number" inputMode="numeric" min={0} max={100000} step={1} required value={price} onChange={event => setPrice(event.target.value)} /></div>
        <div className="flex-1"><TextField label={billing('packageDays')} type="number" inputMode="numeric" min={1} max={365} step={1} required value={days} onChange={event => setDays(event.target.value)} /></div>
      </div>}
      {(error || catalog.error) && <p role="alert" className="text-sm text-danger">{error || catalog.error}</p>}
      <div className="flex gap-inline"><Button type="submit" disabled={catalog.busy}>{t('save')}</Button><Button variant="secondary" disabled={catalog.busy} onClick={onClose}>{t('cancel')}</Button></div>
    </form>
  </ResponsiveDialog>;
}

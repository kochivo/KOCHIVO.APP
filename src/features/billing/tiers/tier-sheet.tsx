'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { TextField } from '@/ui/text-field';
import { Button } from '@/ui/button';
import { saveTier } from '../data/catalog-actions';
import { messages } from './messages';
import type { Tier } from './types';
import type { useCatalog } from './use-catalog';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';

export function TierSheet({ tier, catalog, onClose }: { tier?: Tier; catalog: ReturnType<typeof useCatalog>; onClose: () => void }) {
  const t = useT(messages);
  const success = useT(successMessages), toast = useToast();
  const [name, setName] = useState(tier?.name ?? ''), [description, setDescription] = useState(tier?.description ?? '');
  const [features, setFeatures] = useState(tier?.features.join('\n') ?? ''), [color, setColor] = useState(tier?.color ?? 'muted');
  const [error, setError] = useState('');
  async function save() {
    const list = features.split('\n').map(value => value.trim()).filter(Boolean);
    if (!name.trim() || list.length > 10 || list.some(value => value.length > 80)) { setError(t('invalid')); return; }
    const fields = { name: name.trim(), description, features: list, color, position: tier?.position ?? Math.max(-1, ...(catalog.data?.tiers.map(row => row.position) ?? [])) + 1, is_featured: tier?.is_featured ?? false };
    const optimistic: Tier = { ...fields, id: tier?.id ?? uuidv7(), captain_id: tier?.captain_id ?? '', archived_at: null, created_at: tier?.created_at ?? '' };
    if (await catalog.change(current => ({ ...current, tiers: tier ? current.tiers.map(row => row.id === tier.id ? optimistic : row) : [...current.tiers, optimistic] }),
      () => saveTier({ ...fields, ...(tier ? { id: tier.id } : {}) }))) {
      toast.success({ title: success('packageSaved'), detail: success('packageName', { name: fields.name }), icon: 'payment' }); onClose();
    }
  }
  return <ResponsiveDialog modal fallbackId="catalog-heading" onDismiss={() => { if (!catalog.busy) onClose(); }} aria-labelledby="tier-title"
    className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-5 text-ink backdrop:bg-bg-deep/80">
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save(); }}>
      <h2 id="tier-title" className="font-display text-[19px]">{t(tier ? 'editFeatures' : 'newTier')}</h2>
      <TextField label={t('name')} required maxLength={40} value={name} onChange={event => setName(event.target.value)} />
      <TextField label={t('description')} maxLength={80} value={description} onChange={event => setDescription(event.target.value)} />
      <label className="block text-xs text-faint">{t('features')}<textarea className="mt-2 min-h-36 w-full rounded-control border border-line bg-surface p-3 text-ink" value={features} onChange={event => setFeatures(event.target.value)} /></label>
      <label className="block text-xs text-faint">{t('color')}<select value={color} onChange={event => setColor(event.target.value)} className="mt-2 min-h-12 w-full rounded-control border border-line bg-surface px-3 text-ink">
        {(['muted', 'lime', 'warn', 'danger'] as const).map(value => <option key={value} value={value}>{t(value)}</option>)}
      </select></label>
      {(error || catalog.error) && <p role="alert" className="text-sm text-danger">{error || catalog.error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={catalog.busy}>{t('save')}</Button><Button variant="secondary" disabled={catalog.busy} onClick={onClose}>{t('cancel')}</Button></div>
    </form>
  </ResponsiveDialog>;
}

'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { uuidv7 } from '@/core/offline/ids';
import { Button } from '@/ui/button';
import { saveOffer } from '../data/catalog-actions';
import type { CatalogOffer } from '../tiers/types';
import type { useCatalog } from '../tiers/use-catalog';
import { messages } from './messages';
import { offerDraft, offerPayload, validateOffer } from './offer-form';
import { presets, presetDates } from './preset-dates';
import type { Preset } from './preset-dates';
import { OfferFields } from './offer-fields';
import { OfferPreview } from './offer-preview';

export function OfferScreen({ offer, preset, catalog, now, onClose }: { offer?: CatalogOffer; preset?: Preset; catalog: ReturnType<typeof useCatalog>; now: Date; onClose: () => void }) {
  const t = useT(messages), zone = useTimezone();
  const [draft, setDraft] = useState(() => ({ ...offerDraft(now, zone, offer), ...(preset ? { name: preset === 'scratch' ? '' : t(preset), ...presetDates(preset, now, zone) } : {}) }));
  const [activePreset, setPreset] = useState<Preset | undefined>(preset), [error, setError] = useState('');
  async function save() {
    const invalid = validateOffer(draft);
    if (invalid) { setError(t(invalid)); return; }
    const fields = offerPayload(draft, zone);
    const optimistic: CatalogOffer = { ...fields, id: offer?.id ?? uuidv7(), captain_id: offer?.captain_id ?? '', created_at: offer?.created_at ?? '', used_count: offer?.used_count ?? 0, paused_at: offer?.paused_at ?? null };
    if (await catalog.change(current => ({ ...current, offers: offer ? current.offers.map(row => row.id === offer.id ? optimistic : row) : [...current.offers, optimistic] }), () => saveOffer(fields))) onClose();
  }
  if (!catalog.data) return null;
  return <form onSubmit={event => { event.preventDefault(); void save(); }}>
    <header className="mb-[18px] flex flex-wrap items-center gap-3.5"><div className="me-auto"><button type="button" disabled={catalog.busy} onClick={onClose} className="min-h-12 text-xs text-faint">{t('breadcrumb')}</button><h1 className="font-display text-[30px] font-semibold leading-tight">{t(offer ? 'editOffer' : 'newOffer')}</h1></div>
      <Button variant="secondary" className="min-h-12 rounded-full" disabled={catalog.busy} onClick={onClose}>{t('cancel')}</Button>
      <Button type="submit" className="min-h-12 rounded-full" disabled={catalog.busy}>{t(offer ? 'save' : 'launch')}</Button>
    </header>
    {(error || catalog.error) && <p role="alert" className="mb-4 text-sm text-danger">{error || catalog.error}</p>}
    <div className="grid items-start gap-[18px] min-[1001px]:grid-cols-[minmax(0,1fr)_340px]">
      <fieldset disabled={catalog.busy} className="glass min-w-0 space-y-4 rounded-card border border-line-soft px-5 py-[18px]">
        <div><p className="mb-2 text-xs text-faint">{t('preset')}</p><div className="flex flex-wrap gap-2">{presets.map(value => <button key={value} type="button" aria-pressed={activePreset === value} className="min-h-12 rounded-full border border-dashed border-line px-3.5 text-[12.5px] text-muted aria-pressed:border-warn aria-pressed:text-warn" onClick={() => {
          setPreset(value); setDraft(current => ({ ...current, name: value === 'scratch' ? '' : t(value), ...presetDates(value, now, zone) }));
        }}>{t(value)}</button>)}</div></div>
        <OfferFields draft={draft} onChange={setDraft} catalog={catalog.data} />
      </fieldset>
      <OfferPreview draft={draft} catalog={catalog.data} now={now} used={offer?.used_count ?? 0} />
    </div>
  </form>;
}

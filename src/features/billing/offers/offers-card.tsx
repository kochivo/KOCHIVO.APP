'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { Button } from '@/ui/button';
import { offerStatus } from '../pricing';
import { messages } from './messages';
import { presets } from './preset-dates';
import type { Preset } from './preset-dates';
import { offerDescription, offerValue, statusLabel } from './offer-summary';
import type { Catalog, CatalogOffer } from '../tiers/types';

export function OffersCard({ catalog, now, busy, onEdit, onPause, onNew }: {
  catalog: Catalog; now: Date; busy: boolean; onEdit: (offer: CatalogOffer) => void;
  onPause: (offer: CatalogOffer) => void; onNew: (preset?: Preset) => void;
}) {
  const t = useT(messages), locale = useLocale(), zone = useTimezone();
  return <section aria-label={t('newOffer')} className="glass overflow-hidden rounded-card border border-line-soft">
    {catalog.offers.length ? catalog.offers.map(offer => {
      const status = offerStatus(offer, now), running = status === 'running';
      return <div key={offer.id} className="flex flex-wrap items-center gap-card-gap border-t border-line-soft px-page-x py-card first:border-0">
        <span className={`grid size-[42px] shrink-0 place-items-center rounded-xl font-display text-row font-extrabold ${running ? 'bg-warn-soft text-warn' : 'bg-surface-raised text-muted'}`}>{offerValue(offer, t)}</span>
        <div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-center gap-inline"><b className="break-words">{offer.name}</b><span className={`rounded-full px-stack py-inline text-micro ${running ? 'bg-warn-soft text-warn' : 'bg-surface-raised text-muted'}`}>{statusLabel(offer, now, zone, locale, t)}</span></div>
          <p className="mt-inline break-words text-xs text-faint">{offerDescription(offer, catalog, t)}</p></div>
        <Button variant="secondary" className="min-h-12 rounded-full text-xs" disabled={busy} onClick={() => onEdit(offer)}>{t('edit')}</Button>
        {(status === 'running' || status === 'paused' || status === 'scheduled') && <Button variant="secondary" className="min-h-12 rounded-full text-xs" disabled={busy} onClick={() => onPause(offer)}>{t(status === 'paused' ? 'resume' : 'pause')}</Button>}
      </div>;
    }) : <p className="px-page-x py-stack text-xs text-faint">{t('noOffers')}</p>}
    <div className="flex flex-wrap items-center gap-inline border-t border-dashed border-line px-page-x py-inline text-faint">
      <Button variant="secondary" disabled={busy} onClick={() => onNew()} className="min-h-12 me-auto text-sm">{t('addOffer')}</Button>
      {presets.slice(0, 4).map(preset => <Button variant="secondary" key={preset} disabled={busy} onClick={() => onNew(preset)} className="min-h-12 rounded-full px-stack text-micro">{t(preset)}</Button>)}
    </div>
  </section>;
}

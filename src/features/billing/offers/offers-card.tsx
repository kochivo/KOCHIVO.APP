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
      return <div key={offer.id} className="flex flex-wrap items-center gap-3.5 border-t border-line-soft px-[18px] py-3.5 first:border-0">
        <span className={`grid size-[42px] shrink-0 place-items-center rounded-xl font-display text-[13px] font-extrabold ${running ? 'bg-warn-soft text-warn' : 'bg-surface-raised text-muted'}`}>{offerValue(offer, t)}</span>
        <div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-center gap-2"><b className="break-words">{offer.name}</b><span className={`rounded-full px-2.5 py-1 text-[11.5px] ${running ? 'bg-warn-soft text-warn' : 'bg-surface-raised text-muted'}`}>{statusLabel(offer, now, zone, locale, t)}</span></div>
          <p className="mt-1 break-words text-xs text-faint">{offerDescription(offer, catalog, t)}</p></div>
        <Button variant="secondary" className="min-h-12 rounded-full text-[12.5px]" disabled={busy} onClick={() => onEdit(offer)}>{t('edit')}</Button>
        {(status === 'running' || status === 'paused' || status === 'scheduled') && <Button variant="secondary" className="min-h-12 rounded-full text-[12.5px]" disabled={busy} onClick={() => onPause(offer)}>{t(status === 'paused' ? 'resume' : 'pause')}</Button>}
      </div>;
    }) : <p className="px-[18px] py-3 text-xs text-faint">{t('noOffers')}</p>}
    <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line px-[18px] py-2 text-faint">
      <Button variant="secondary" disabled={busy} onClick={() => onNew()} className="min-h-12 me-auto text-sm">{t('addOffer')}</Button>
      {presets.slice(0, 4).map(preset => <Button variant="secondary" key={preset} disabled={busy} onClick={() => onNew(preset)} className="min-h-12 rounded-full px-2.5 text-[11.5px]">{t(preset)}</Button>)}
    </div>
  </section>;
}

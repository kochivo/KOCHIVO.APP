'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { workspaceMessages } from '../messages';
import { messages } from '../offers/messages';
import { offerDescription, statusLabel } from '../offers/offer-summary';
import { offerStatus } from '../pricing';
import type { Catalog, CatalogOffer } from '../tiers/types';

export function WorkspaceOffersCard({ catalog, now, busy, onNew, onEdit }: {
  catalog: Catalog; now: Date; busy: boolean; onNew: () => void; onEdit: (offer: CatalogOffer) => void;
}) {
  const t = useT(workspaceMessages), offers = useT(messages), locale = useLocale(), zone = useTimezone();
  return <section className="glass rounded-card border border-line-soft p-[18px]">
    <header className="flex items-center justify-between gap-3"><h2 className="font-semibold">{t('offers')}</h2><button disabled={busy} onClick={onNew} className="min-h-12 text-sm text-lime">{t('newOffer')}</button></header>
    {catalog.offers.length ? <ul>{catalog.offers.map(offer => <li key={offer.id} className="border-t border-line-soft first:border-0">
      <button disabled={busy} onClick={() => onEdit(offer)} className="flex min-h-12 w-full items-center gap-3 py-3 text-start">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised font-display text-lime">{t(offer.kind === 'bonus_days' ? 'bonus' : 'percent')}</span>
        <span className="min-w-0 flex-1"><b className="block text-sm">{offer.name}</b><small className="text-xs text-muted">{offerDescription(offer, catalog, offers)}</small></span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${offerStatus(offer, now) === 'running' ? 'bg-lime-soft text-lime' : 'bg-surface-raised text-muted'}`}>{offerStatus(offer, now) === 'running' ? offers('running') : statusLabel(offer, now, zone, locale, offers)}</span>
      </button>
    </li>)}</ul> : <p className="py-3 text-sm text-faint">{offers('noOffers')}</p>}
  </section>;
}

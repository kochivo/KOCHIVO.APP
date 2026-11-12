'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useT } from '@/core/i18n/client';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { ErrorState } from '@/ui/error-state';
import { saveTier, setOfferPaused } from '../data/catalog-actions';
import { changeTierStatus } from '../data/tier-operations';
import { OffersCard } from '../offers/offers-card';
import type { Preset } from '../offers/preset-dates';
import { messages } from './messages';
import { TierCard } from './tier-card';
import { useCatalog } from './use-catalog';
import { UnassignedPackages } from './unassigned-packages';
import { tierOperation } from './tier-operations';
import type { CatalogOffer, CatalogPackage, Tier } from './types';

const TierSheet = dynamic(() => import('./tier-sheet').then(module => module.TierSheet), { loading: () => <LoadingState variant="cards" /> });
const PackageSheet = dynamic(() => import('./package-sheet').then(module => module.PackageSheet), { loading: () => <LoadingState variant="cards" /> });
const OfferScreen = dynamic(() => import('../offers/offer-screen').then(module => module.OfferScreen), { loading: () => <LoadingState variant="cards" /> });
type Panel = { kind: 'tier'; tier?: Tier } | { kind: 'package'; tierId: string; item?: CatalogPackage }
  | { kind: 'offer'; offer?: CatalogOffer; preset?: Preset };
export function CatalogScreen() {
  const catalog = useCatalog(), t = useT(messages);
  const [initialNow] = useState(() => new Date());
  const clock = useCalendarClock(), now = clock.now ?? initialNow;
  const [panel, setPanel] = useState<Panel | null>(null);
  const data = catalog.data;
  if (!data && catalog.status === 'error') return <ErrorState message={t('loadFailed')} retryLabel={t('retry')} onRetry={() => void catalog.retry()} />;
  if (!data) return <LoadingState variant="cards" />;
  const tiers = [...data.tiers].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const close = () => setPanel(null);
  async function move(tier: Tier, offset: number) {
    const index = tiers.findIndex(row => row.id === tier.id), target = index + offset;
    if (target < 0 || target >= tiers.length) return;
    const reordered = [...tiers];
    reordered.splice(index, 1); reordered.splice(target, 0, tier);
    await catalog.change(current => ({ ...current, tiers: reordered.map((row, position) => ({ ...row, position })) }),
      () => tierOperation(reordered.map((row, position) => ({ before: row, after: { ...row, position } })), saveTier, async () => ({ data: true }), t('failure')));
  }
  if (panel?.kind === 'offer') return <OfferScreen catalog={catalog} now={now} offer={panel.offer} preset={panel.preset} onClose={close} />;
  return <section className="space-y-4" aria-busy={catalog.busy}>
    <header className="mb-[18px] flex flex-wrap items-center gap-3.5"><div className="me-auto">
      <Link href="/captain/billing" className="inline-flex min-h-12 items-center text-xs text-faint">{t('breadcrumb')}</Link>
      <h1 id="catalog-heading" tabIndex={-1} className="font-display text-[30px] font-semibold leading-tight">{t('title')}</h1>
      <p className="mt-1 text-[13px] text-muted">{t('intro')}</p></div>
      {data.publicSlug ? <Link href={`/c/${encodeURIComponent(data.publicSlug)}`} className="inline-flex min-h-12 items-center rounded-full border border-line px-3.5 text-[12.5px]">{t('publicPage')}</Link>
        : <Button variant="secondary" className="min-h-12 rounded-full" disabled>{t('publicPage')}</Button>}
      <Button className="min-h-12 rounded-full" disabled={catalog.busy} onClick={() => setPanel({ kind: 'tier' })}>{t('newTier')}</Button>
    </header>
    {(catalog.error || catalog.status === 'error') && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">{catalog.error || t('loadFailed')}<Button variant="secondary" onClick={() => void catalog.retry()}>{t('retry')}</Button></div>}
    <OffersCard catalog={data} now={now} busy={catalog.busy} onEdit={offer => setPanel({ kind: 'offer', offer })} onNew={preset => setPanel({ kind: 'offer', preset })}
      onPause={offer => void catalog.change(current => ({ ...current, offers: current.offers.map(row => row.id === offer.id ? { ...row, paused_at: row.paused_at ? null : now.toISOString() } : row) }), () => setOfferPaused(offer.id, offer.paused_at === null))} />
    {!tiers.length && <p className="glass rounded-card border border-line-soft p-5 text-sm text-faint">{t('empty')}</p>}
    <div className="grid items-start gap-3.5 min-[1001px]:grid-cols-3">
      {tiers.map(tier => <TierCard key={tier.id} tier={tier} packages={data.packages.filter(item => item.tier_id === tier.id).sort((a, b) => a.days - b.days)} count={data.counts[tier.id] ?? 0} busy={catalog.busy}
        onEdit={() => setPanel({ kind: 'tier', tier })} onPackage={item => setPanel({ kind: 'package', tierId: tier.id, item })}
        onMove={offset => void move(tier, offset)} onFeature={() => void catalog.change(current => ({ ...current, tiers: current.tiers.map(row => ({ ...row, is_featured: row.id === tier.id && !tier.is_featured })) }), () => changeTierStatus(tier.id, tier.is_featured ? 'unfeature' : 'feature'))}
        onArchive={() => void catalog.change(current => ({ ...current, tiers: current.tiers.filter(row => row.id !== tier.id) }), () => changeTierStatus(tier.id, 'archive'))} />)}
      <button className="glass flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line text-faint" disabled={catalog.busy} onClick={() => setPanel({ kind: 'tier' })}>{t('addTier')}<span className="text-xs">{t('example')}</span></button>
    </div>
    <UnassignedPackages packages={data.packages.filter(item => !tiers.some(tier => tier.id === item.tier_id))} busy={catalog.busy} onEdit={item => setPanel({ kind: 'package', tierId: '', item })} />
    {tiers.some(tier => tier.name === 'أساسي') && <p className="mt-[26px] rounded-[18px] border border-dashed border-line px-[18px] py-3.5 text-[12.5px] leading-[1.9] text-muted">{t('oldNote')}</p>}
    {panel?.kind === 'tier' && <TierSheet catalog={catalog} tier={panel.tier} onClose={close} />}
    {panel?.kind === 'package' && <PackageSheet catalog={catalog} item={panel.item} tierId={panel.tierId} onClose={close} />}
  </section>;
}

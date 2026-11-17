'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useT } from '@/core/i18n/client';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { KoPlus } from '@/ui/icons/ko-plus';
import { KoSend } from '@/ui/icons/ko-send';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { workspaceMessages } from '../messages';
import { messages as financeMessages } from '../workspace/messages';
import { messages } from '../tiers/messages';
import { useCatalog } from '../tiers/use-catalog';
import { UnassignedPackages } from '../tiers/unassigned-packages';
import type { Tier, CatalogPackage, CatalogOffer } from '../tiers/types';
import { WorkspaceTierCard } from './workspace-tier-card';
import { WorkspaceOffersCard } from './workspace-offers-card';
import { Button } from '@/ui/button';
import { FreezeSettings } from '../freeze/freeze-settings';

const TierSheet = dynamic(() => import('../tiers/tier-sheet').then(module => module.TierSheet), { loading: () => <LoadingState variant="detail" /> });
const PackageSheet = dynamic(() => import('../tiers/package-sheet').then(module => module.PackageSheet), { loading: () => <LoadingState variant="detail" /> });
const OfferScreen = dynamic(() => import('../offers/offer-screen').then(module => module.OfferScreen), { loading: () => <LoadingState variant="detail" /> });
type Panel = { kind: 'tier'; tier?: Tier } | { kind: 'package'; tierId: string; item?: CatalogPackage } | { kind: 'offer'; offer?: CatalogOffer };
export function WorkspaceCatalog() {
  const catalog = useCatalog(), t = useT(workspaceMessages), legacy = useT(messages), finance = useT(financeMessages);
  const [panel, setPanel] = useState<Panel | null>(null), [initialNow] = useState(() => new Date());
  const clock = useCalendarClock(), now = clock.now ?? initialNow, data = catalog.data;
  if (!data && catalog.status === 'error') return <ErrorState message={legacy('loadFailed')} retryLabel={legacy('retry')} onRetry={() => void catalog.retry()} />;
  if (!data) return <LoadingState variant="cards" />;
  const close = () => setPanel(null);
  if (panel?.kind === 'offer') return <OfferScreen catalog={catalog} now={now} offer={panel.offer} onClose={close} />;
  const tiers = [...data.tiers].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  return <section id="catalog-heading" tabIndex={-1} className="space-y-card-gap" aria-busy={catalog.busy}>
    <PageBarTitle title={finance('catalogTitle')} subtitle={finance('catalogIntro')} />
    <PageBarActions>
      <Link href="/captain/billing" aria-label={t('back')} className="press grid min-h-12 min-w-12 cursor-pointer place-items-center rounded-full border border-line bg-surface focus-visible:ring-2 focus-visible:ring-lime"><KoSend aria-hidden className="size-4 rotate-45 ltr:rotate-225" /></Link>
      <Button disabled={catalog.busy} onClick={() => setPanel({ kind: 'tier' })} block={false} className="ms-auto"><KoPlus aria-hidden className="size-4" />{t('newPackage')}</Button>
    </PageBarActions>
    {(catalog.error || catalog.status === 'error') && <ErrorState message={catalog.error || legacy('loadFailed')} retryLabel={legacy('retry')} onRetry={() => void catalog.retry()} />}
    {tiers.length ? <div className="grid items-stretch gap-card-gap min-[760px]:grid-cols-2 min-[1100px]:grid-cols-6">{tiers.map((tier, index) => <div key={tier.id}
      className={`${index === tiers.length - 1 && tiers.length % 2 ? 'min-[760px]:col-span-2' : ''} ${index >= tiers.length - tiers.length % 3 ? tiers.length % 3 === 1 ? 'min-[1100px]:col-span-6' : 'min-[1100px]:col-span-3' : 'min-[1100px]:col-span-2'}`}>
      <WorkspaceTierCard tier={tier} busy={catalog.busy} count={data.counts[tier.id] ?? 0}
      packages={data.packages.filter(item => item.tier_id === tier.id).sort((a, b) => a.days - b.days)}
      onEdit={() => setPanel({ kind: 'tier', tier })} onPackage={item => setPanel({ kind: 'package', tierId: tier.id, item })} /></div>)}</div>
      : <p className="glass rounded-card p-card text-sm text-faint">{legacy('empty')}</p>}
    <WorkspaceOffersCard catalog={data} now={now} busy={catalog.busy} onNew={() => setPanel({ kind: 'offer' })} onEdit={offer => setPanel({ kind: 'offer', offer })} />
    <UnassignedPackages packages={data.packages.filter(item => !tiers.some(tier => tier.id === item.tier_id))} busy={catalog.busy} onEdit={item => setPanel({ kind: 'package', tierId: '', item })} />
    <FreezeSettings />
    {panel?.kind === 'tier' && <TierSheet catalog={catalog} tier={panel.tier} onClose={close} />}
    {panel?.kind === 'package' && <PackageSheet catalog={catalog} item={panel.item} tierId={panel.tierId} onClose={close} />}
  </section>;
}

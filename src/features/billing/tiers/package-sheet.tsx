'use client';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { Button } from '@/ui/button';
import { PackagesCard } from '../components/packages-card';
import { saveCatalogPackage } from '../data/catalog-package';
import { archivePackage } from '../data/finance-actions';
import { messages } from './messages';
import type { CatalogPackage } from './types';
import type { useCatalog } from './use-catalog';

export function PackageSheet({ item, tierId, catalog, onClose }: { item?: CatalogPackage; tierId: string; catalog: ReturnType<typeof useCatalog>; onClose: () => void }) {
  const t = useT(messages);
  if (!catalog.data) return null;
  return <ResponsiveDialog modal fallbackId="catalog-heading" onDismiss={() => { if (!catalog.busy) onClose(); }} aria-labelledby="package-title"
    className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-card text-ink backdrop:bg-bg-deep/80">
    <h2 id="package-title" className="mb-card-gap font-display text-title">{t(item ? 'editPackage' : 'addDuration')}</h2>
    <PackagesCard packages={[]} onChange={() => {}} initialAdding editor={{ item, tierId, packages: catalog.data.packages, tiers: catalog.data.tiers, tierLabel: t('tier'), noTierLabel: t('noTier'), saveLabel: t('save'), save: async fields => {
      const optimistic: CatalogPackage = { id: item?.id ?? uuidv7(), name: fields.name, price_egp: fields.price, days: fields.days, kind: fields.kind, sessions: fields.sessions, tier_id: fields.tier_id, max_freeze_days: fields.max_freeze_days };
      const ok = await catalog.change(current => ({ ...current, packages: item ? current.packages.map(row => row.id === item.id ? optimistic : row) : [...current.packages, optimistic] }), () => saveCatalogPackage({ ...fields, ...(item ? { id: item.id } : {}) }));
      if (ok) onClose();
      return ok;
    } }} />
    {catalog.error && <p role="alert" className="mt-stack text-sm text-danger">{catalog.error}</p>}
    <div className="mt-card-gap flex flex-wrap gap-inline"><Button variant="secondary" disabled={catalog.busy} onClick={onClose}>{t('cancel')}</Button>
      {item && <Button variant="secondary" disabled={catalog.busy} onClick={async () => {
        if (await catalog.change(current => ({ ...current, packages: current.packages.filter(row => row.id !== item.id) }), () => archivePackage({ id: item.id }))) onClose();
      }}>{t('archivePackage')}</Button>}
    </div>
  </ResponsiveDialog>;
}

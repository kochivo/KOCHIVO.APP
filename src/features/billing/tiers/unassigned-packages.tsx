'use client';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';
import type { CatalogPackage } from './types';

export function UnassignedPackages({ packages, busy, onEdit }: { packages: CatalogPackage[]; busy: boolean; onEdit: (item: CatalogPackage) => void }) {
  const t = useT(messages);
  if (!packages.length) return null;
  return <section className="glass rounded-card border border-line-soft p-5">
    <h2 className="font-display text-[19px] font-semibold">{t('noTier')}</h2>
    <ul>{packages.map(item => <li key={item.id} className="border-t border-line-soft first:border-0">
      <button disabled={busy} onClick={() => onEdit(item)} className="flex min-h-12 w-full flex-wrap items-center justify-between gap-3 py-3 text-start text-sm"><span>{item.name}</span><span className="text-muted">{t('editPackage')}</span></button>
    </li>)}</ul>
  </section>;
}

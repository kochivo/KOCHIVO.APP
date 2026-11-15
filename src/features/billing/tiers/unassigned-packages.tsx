'use client';
import { Button } from '@/ui/button';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';
import type { CatalogPackage } from './types';

export function UnassignedPackages({ packages, busy, onEdit }: { packages: CatalogPackage[]; busy: boolean; onEdit: (item: CatalogPackage) => void }) {
  const t = useT(messages);
  if (!packages.length) return null;
  return <section className="glass rounded-card border border-line-soft p-card">
    <h2 className="font-display text-title font-semibold">{t('noTier')}</h2>
    <ul>{packages.map(item => <li key={item.id} className="border-t border-line-soft first:border-0">
      <Button variant="secondary" disabled={busy} onClick={() => onEdit(item)} className="flex min-h-12 w-full flex-wrap items-center justify-between gap-stack py-stack text-start text-sm"><span>{item.name}</span><span className="text-muted">{t('editPackage')}</span></Button>
    </li>)}</ul>
  </section>;
}

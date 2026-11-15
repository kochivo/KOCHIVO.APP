'use client';
import { Check, ChevronLeft, Pencil } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { workspaceMessages } from '../messages';
import { messages } from '../tiers/messages';
import { duplicateDuration, durationLabel } from '../package-choice';
import type { Tier, CatalogPackage } from '../tiers/types';
import { Button } from '@/ui/button';

export function WorkspaceTierCard({ tier, packages, busy, onEdit, onPackage }: {
  tier: Tier; packages: CatalogPackage[]; busy: boolean; onEdit: () => void; onPackage: (item?: CatalogPackage) => void;
}) {
  const t = useT(workspaceMessages), catalog = useT(messages), locale = useLocale();
  return <article className={`${tier.is_featured ? 'glass-featured' : 'glass'} relative min-w-0 rounded-card border border-line-soft p-card`}>
    {tier.is_featured && <span className="absolute end-3 top-3 rounded-full bg-lime-soft px-stack py-inline text-micro text-lime">{t('featured')}</span>}
    <h2 className="pe-section text-base font-semibold">{tier.name}</h2>
    {tier.description && <p className="mt-inline text-xs text-muted">{tier.description}</p>}
    <ul className="my-stack space-y-inline text-xs">{tier.features.length ? tier.features.map((feature, index) => <li key={index} className="flex items-start gap-inline"><Check aria-hidden className="size-4 shrink-0 text-lime" />{feature}</li>) : <li className="text-faint">{catalog('noFeatures')}</li>}</ul>
    {packages.length ? packages.map(item => <button key={item.id} disabled={busy} onClick={() => onPackage(item)} className="press mb-inline flex min-h-12 w-full cursor-pointer items-center justify-between gap-inline rounded-control border border-line-soft bg-surface px-stack text-start text-row hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-40">
      <span className="py-inline">{item.kind === 'sessions' ? item.name : durationLabel(item.days, catalog, locale)}
        {duplicateDuration(packages, item) && <span className="block text-xs text-warn">{catalog('duplicateWarning')}</span>}
      </span>
      <b className="font-display tabular-nums">{formatNumber(item.price_egp, locale)} {catalog('currency')}</b>
      {duplicateDuration(packages, item) ? <span className="underline">{catalog('editDuration')}</span> : <ChevronLeft aria-hidden className="dir-icon size-4 shrink-0 text-muted" />}
    </button>) : <p className="py-stack text-xs text-faint">{catalog('noDurations')}</p>}
    <button disabled={busy} onClick={() => onPackage()} className="press mt-inline min-h-12 w-full cursor-pointer rounded-control border border-dashed border-line bg-surface px-stack text-sm text-muted hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-lime">{catalog('addDuration')}</button>
    <Button disabled={busy} onClick={onEdit} variant="secondary" block className="mt-stack"><Pencil aria-hidden className="size-4" />{t('edit')}</Button>
  </article>;
}

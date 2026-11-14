'use client';
import { Check, Pencil } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { workspaceMessages } from '../messages';
import { messages } from '../tiers/messages';
import type { Tier, CatalogPackage } from '../tiers/types';

export function WorkspaceTierCard({ tier, packages, busy, onEdit, onPackage }: {
  tier: Tier; packages: CatalogPackage[]; busy: boolean; onEdit: () => void; onPackage: (item?: CatalogPackage) => void;
}) {
  const t = useT(workspaceMessages), catalog = useT(messages), locale = useLocale();
  return <article className={`${tier.is_featured ? 'glass-featured' : 'glass'} relative min-w-0 rounded-card border border-line-soft p-[18px]`}>
    {tier.is_featured && <span className="absolute end-3 top-3 rounded-full bg-lime-soft px-2.5 py-1 text-[11px] text-lime">{t('featured')}</span>}
    <h2 className="pe-14 text-base font-semibold">{tier.name}</h2>
    {tier.description && <p className="mt-1 text-xs text-muted">{tier.description}</p>}
    <ul className="my-3 space-y-1.5 text-[12.5px]">{tier.features.length ? tier.features.map((feature, index) => <li key={index} className="flex items-start gap-2"><Check aria-hidden className="size-4 shrink-0 text-lime" />{feature}</li>) : <li className="text-faint">{catalog('noFeatures')}</li>}</ul>
    {packages.length ? packages.map(item => <button key={item.id} disabled={busy} onClick={() => onPackage(item)} className="flex min-h-12 w-full items-center justify-between gap-2 border-b border-line-soft text-start text-[13px] disabled:opacity-40">
      <span>{item.kind === 'sessions' ? item.name : item.days === 30 ? catalog('month') : item.days % 30 === 0 ? catalog('months', { n: item.days / 30 }) : catalog('days', { n: item.days })}</span>
      <b className="font-display tabular-nums">{formatNumber(item.price_egp, locale)} {catalog('currency')}</b>
    </button>) : <p className="py-3 text-xs text-faint">{catalog('noDurations')}</p>}
    <button disabled={busy} onClick={() => onPackage()} className="min-h-12 text-sm text-muted">{catalog('addDuration')}</button>
    <button disabled={busy} onClick={onEdit} className="glass mt-2.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-line text-sm disabled:opacity-40"><Pencil aria-hidden className="size-4" />{t('edit')}</button>
  </article>;
}

'use client';
import { Check, ChevronLeft, Pencil } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { workspaceMessages } from '../messages';
import { messages } from '../tiers/messages';
import { duplicateDuration, durationLabel } from '../package-choice';
import type { Tier, CatalogPackage } from '../tiers/types';
import { Button } from '@/ui/button';

export function WorkspaceTierCard({ tier, packages, busy, count, onEdit, onPackage }: {
  tier: Tier; packages: CatalogPackage[]; busy: boolean; count?: number;
  onEdit: () => void; onPackage: (item?: CatalogPackage) => void;
}) {
  const t = useT(workspaceMessages), catalog = useT(messages), locale = useLocale();
  return <article className={`${tier.is_featured ? 'glass-featured cut-corner' : 'glass'} flex h-full min-w-0 flex-col rounded-card p-card`}>
    <header className="flex flex-wrap items-center gap-inline">
      <h2 className="min-w-0 flex-1 break-words text-title font-bold">{tier.name}</h2>
      {tier.is_featured && <span className="tone-lime rounded-md px-inline text-micro font-semibold">{t('featured')}</span>}
    </header>
    {tier.description && <p className="mt-inline text-xs text-muted">{tier.description}</p>}
    <div className="my-stack divide-y divide-line-soft">{packages.length ? packages.map(item =>
      <Button variant="ghost" key={item.id} disabled={busy} onClick={() => onPackage(item)}
        className="min-h-12 w-full min-w-0 flex-wrap justify-start gap-inline px-inline text-start focus-visible:ring-2 focus-visible:ring-lime">
        <span className="font-display text-stat font-extrabold tracking-tight tabular-nums">{formatNumber(item.price_egp, locale)}</span>
        <span className="text-xs text-muted">{catalog('currency')} · {item.kind === 'sessions' ? item.name : durationLabel(item.days, catalog, locale)}</span>
        {duplicateDuration(packages, item) ? <span className="w-full text-xs text-warn">
          {catalog('duplicateWarning')} <span className="underline">{catalog('editDuration')}</span>
        </span> : <ChevronLeft aria-hidden className="dir-icon ms-auto size-4 shrink-0 text-muted" />}
      </Button>) : <p className="py-stack text-xs text-muted">{catalog('noDurations')}</p>}</div>
    <ul className="mb-card-gap space-y-stack text-row">{tier.features.length ? tier.features.map((feature, index) =>
      <li key={index} className="flex items-start gap-inline"><Check aria-hidden className="size-5 shrink-0 text-lime" />{feature}</li>)
      : <li className="text-muted">{catalog('noFeatures')}</li>}</ul>
    <footer className="mt-auto flex flex-wrap items-center gap-inline border-t border-line-soft pt-stack">
      {count !== undefined && <span className="me-auto text-xs text-muted">{catalog('players', { n: formatNumber(count, locale) })}</span>}
      <Button variant="secondary" block={false} disabled={busy} onClick={() => onPackage()}
        className="border-dashed">{catalog('addDuration')}</Button>
      <Button disabled={busy} onClick={onEdit} variant="secondary" block={false}><Pencil aria-hidden className="size-4" />{t('edit')}</Button>
    </footer>
  </article>;
}

'use client';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';
import { Check, Ellipsis } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { savingsPercent } from '../pricing';
import { duplicateDuration, durationLabel } from '../package-choice';
import { messages } from './messages';
import type { CatalogPackage, Tier } from './types';

export const tierColors: Record<string, string> = { muted: 'bg-muted', lime: 'bg-lime', warn: 'bg-warn', danger: 'bg-danger' };
export function TierCard({ tier, packages, count, busy, onEdit, onFeature, onMove, onArchive, onPackage }: {
  tier: Tier; packages: CatalogPackage[]; count: number; busy: boolean;
  onEdit: () => void; onFeature: () => void; onMove: (offset: number) => void; onArchive: () => void;
  onPackage: (item?: CatalogPackage) => void;
}) {
  const t = useT(messages), locale = useLocale();
  const month = packages.find(item => item.kind === 'days' && item.days === 30)?.price_egp ?? 0;
  const menuButton = 'min-h-12 w-full justify-start rounded-full text-start text-xs';
  return <article className={`glass min-w-0 rounded-card border ${tier.is_featured ? 'border-lime' : 'border-line-soft'}`}>
    <header className="flex items-center gap-2.5 border-b border-line-soft px-[18px] py-2">
      <span className={`size-3 shrink-0 rounded-full ${tierColors[tier.color] ?? tierColors.muted}`} />
      <h2 className="min-w-0 break-words font-display text-lg font-semibold">{tier.name}</h2>
      {tier.is_featured && <span className="rounded-full bg-lime-soft px-2 py-1 text-[11.5px] text-lime">{t('featured')}</span>}
      <div className="relative ms-auto shrink-0"><IconButton aria-label={t('menu', { name: tier.name })} popoverTarget={`tier-menu-${tier.id}`}><Ellipsis aria-hidden className="size-5" /></IconButton>
        <div id={`tier-menu-${tier.id}`} popover="auto" className="glass-strong fixed m-0 w-48 space-y-1 overflow-hidden rounded-control border border-line bg-surface p-2 [inset:auto] [position-area:block-end_span-inline-start]">
          <Button variant="secondary" className={menuButton} disabled={busy} onClick={onEdit}>{t('rename')}</Button>
          <Button variant="secondary" className={menuButton} disabled={busy} onClick={onEdit}>{t('editFeatures')}</Button>
          <Button variant="secondary" className={menuButton} disabled={busy} onClick={onFeature}>{t(tier.is_featured ? 'unfeature' : 'feature')}</Button>
          <Button variant="secondary" className={menuButton} disabled={busy} onClick={() => onMove(-1)}>{t('earlier')}</Button>
          <Button variant="secondary" className={menuButton} disabled={busy} onClick={() => onMove(1)}>{t('later')}</Button>
          <Button variant="secondary" className={`${menuButton} border border-danger/40 text-danger!`} disabled={busy} onClick={onArchive}>{t('archive')}</Button>
        </div>
      </div>
    </header>
    {tier.description && <p className="px-[18px] pt-3 text-xs text-faint">{tier.description}</p>}
    <ul className="border-b border-line-soft px-[18px] py-3 text-[12.5px] leading-[2] text-muted">
      {tier.features.length ? tier.features.map((feature, index) => <li key={index} className="flex items-start gap-1.5"><Check aria-hidden className="mt-1.5 size-3.5 shrink-0 text-lime" />{feature}</li>) : <li>{t('noFeatures')}</li>}
    </ul>
    {packages.length ? packages.map(item => {
      const saving = item.kind === 'days' ? savingsPercent(month, item.price_egp, item.days) : 0;
      return <Button variant="secondary" key={item.id} disabled={busy} onClick={() => onPackage(item)} className="flex min-h-12 w-full flex-wrap items-center gap-2.5 border-t border-line-soft px-[18px] py-3 text-start text-[13px] first:border-0">
        <span>{item.kind === 'sessions' ? item.name : durationLabel(item.days, t, locale)}
          {duplicateDuration(packages, item) && <span className="block text-xs text-warn">{t('duplicateWarning')}</span>}
        </span>
        {saving > 0 && <span className="rounded-full bg-lime-soft px-2 py-0.5 text-[11px] text-lime">{t('savePercent', { n: saving })}</span>}
        <b className="ms-auto font-display text-[15px] font-extrabold tabular-nums">{formatNumber(item.price_egp, locale)}</b>{t('currency')}
        {duplicateDuration(packages, item) && <span className="underline">{t('editDuration')}</span>}
      </Button>;
    }) : <p className="px-[18px] py-3 text-xs text-faint">{t('noDurations')}</p>}
    <footer className="flex items-center gap-2 border-t border-line-soft px-[18px] text-xs text-faint">
      <span>{t('players', { n: count })}</span><Button variant="secondary" disabled={busy} onClick={() => onPackage()} className="ms-auto min-h-12">{t('addDuration')}</Button>
    </footer>
  </article>;
}

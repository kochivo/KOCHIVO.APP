'use client';
import { Check, Ellipsis } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { savingsPercent } from '../pricing';
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
  const menuButton = 'flex min-h-12 w-full items-center px-4 text-start text-xs hover:bg-surface-raised disabled:opacity-40';
  return <article className={`glass min-w-0 rounded-card border ${tier.is_featured ? 'border-lime' : 'border-line-soft'}`}>
    <header className="flex items-center gap-2.5 border-b border-line-soft px-[18px] py-2">
      <span className={`size-3 shrink-0 rounded-full ${tierColors[tier.color] ?? tierColors.muted}`} />
      <h2 className="min-w-0 break-words font-display text-lg font-semibold">{tier.name}</h2>
      {tier.is_featured && <span className="rounded-full bg-lime-soft px-2 py-1 text-[11.5px] text-lime">{t('featured')}</span>}
      <details className="relative ms-auto shrink-0"><summary aria-label={t('menu', { name: tier.name })} className="grid min-h-12 min-w-12 cursor-pointer list-none place-items-center rounded-full text-faint"><Ellipsis aria-hidden className="size-5" /></summary>
        <div className="glass-strong absolute end-0 z-10 w-48 overflow-hidden rounded-control border border-line bg-surface">
          <button className={menuButton} disabled={busy} onClick={onEdit}>{t('rename')}</button>
          <button className={menuButton} disabled={busy} onClick={onEdit}>{t('editFeatures')}</button>
          <button className={menuButton} disabled={busy} onClick={onFeature}>{t(tier.is_featured ? 'unfeature' : 'feature')}</button>
          <button className={menuButton} disabled={busy} onClick={() => onMove(-1)}>{t('earlier')}</button>
          <button className={menuButton} disabled={busy} onClick={() => onMove(1)}>{t('later')}</button>
          <button className={menuButton} disabled={busy} onClick={onArchive}>{t('archive')}</button>
        </div>
      </details>
    </header>
    {tier.description && <p className="px-[18px] pt-3 text-xs text-faint">{tier.description}</p>}
    <ul className="border-b border-line-soft px-[18px] py-3 text-[12.5px] leading-[2] text-muted">
      {tier.features.length ? tier.features.map((feature, index) => <li key={index} className="flex items-start gap-1.5"><Check aria-hidden className="mt-1.5 size-3.5 shrink-0 text-lime" />{feature}</li>) : <li>{t('noFeatures')}</li>}
    </ul>
    {packages.length ? packages.map(item => {
      const saving = item.kind === 'days' ? savingsPercent(month, item.price_egp, item.days) : 0;
      return <button key={item.id} disabled={busy} onClick={() => onPackage(item)} className="flex min-h-12 w-full flex-wrap items-center gap-2.5 border-t border-line-soft px-[18px] py-3 text-start text-[13px] first:border-0">
        <span>{item.kind === 'sessions' ? item.name : item.days === 30 ? t('month') : item.days % 30 === 0 ? t('months', { n: item.days / 30 }) : t('days', { n: item.days })}</span>
        {saving > 0 && <span className="rounded-full bg-lime-soft px-2 py-0.5 text-[11px] text-lime">{t('savePercent', { n: saving })}</span>}
        <b className="ms-auto font-display text-[15px] font-extrabold tabular-nums">{formatNumber(item.price_egp, locale)}</b>{t('currency')}
      </button>;
    }) : <p className="px-[18px] py-3 text-xs text-faint">{t('noDurations')}</p>}
    <footer className="flex items-center gap-2 border-t border-line-soft px-[18px] text-xs text-faint">
      <span>{t('players', { n: count })}</span><button disabled={busy} onClick={() => onPackage()} className="ms-auto min-h-12">{t('addDuration')}</button>
    </footer>
  </article>;
}

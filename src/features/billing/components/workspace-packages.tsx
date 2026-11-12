'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../payments/messages';
import { messages as legacyMessages } from '../messages';
import type { Package } from '../types';
import { PackagesCard } from './packages-card';

export function WorkspacePackages({ packages, onChange }: { packages: Package[]; onChange: (packages: Package[]) => void }) {
  const t = useT(messages), legacy = useT(legacyMessages), locale = useLocale();
  const [panel, setPanel] = useState<'add' | 'manage' | null>(null);
  return <section className="glass rounded-card border border-line-soft px-5 py-[18px]">
    <h2 className="font-display text-base font-semibold">{t('packages')}</h2>
    <p className="mb-2 text-xs text-faint">{t('packagesHint')}</p>
    {packages.length ? <ul>{packages.map(item => <li key={item.id} className="border-t border-line-soft first:border-0">
      <button type="button" onClick={() => setPanel('manage')} className="flex min-h-12 w-full items-center gap-2.5 py-3 text-start text-[13px]">
        <span className="min-w-0 flex-1 break-words">{item.name}</span><b className="font-display tabular-nums">{formatNumber(item.price_egp, locale)}</b><span>{t('currency')}</span>
      </button></li>)}</ul> : <p className="py-3 text-xs text-faint">{legacy('noPackages')}</p>}
    <button type="button" className="mt-2 min-h-12 w-full rounded-full border border-line text-[13px]" onClick={() => setPanel('add')}>{t('addPackage')}</button>
    {panel && <ResponsiveDialog modal fallbackId="billing-heading" onDismiss={() => setPanel(null)} aria-labelledby="package-panel-title"
      className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-5 text-ink backdrop:bg-bg-deep/80">
      <header className="mb-3 flex items-center justify-between gap-3"><h2 id="package-panel-title" className="font-display text-[19px] font-semibold">{t('packages')}</h2>
        <button type="button" aria-label={legacy('closeCollect')} onClick={() => setPanel(null)} className="grid min-h-12 min-w-12 place-items-center rounded-full border border-line"><X aria-hidden className="size-5" /></button></header>
      <PackagesCard packages={packages} onChange={onChange} initialAdding={panel === 'add'} />
    </ResponsiveDialog>}
  </section>;
}

'use client';
import { Button } from '@/ui/button';
import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../payments/messages';
import { messages as legacyMessages } from '../messages';
import { messages as tierMessages } from '../tiers/messages';
import type { Package } from '../types';
import { PackagesCard } from './packages-card';
import { buttonClass } from '@/ui/button';

export function WorkspacePackages({ packages, onChange }: { packages: Package[]; onChange: (packages: Package[]) => void }) {
  const t = useT(messages), legacy = useT(legacyMessages), tiers = useT(tierMessages), locale = useLocale();
  const [panel, setPanel] = useState<'add' | 'manage' | null>(null);
  return <section className="glass rounded-card border border-line-soft px-5 py-[18px]">
    <h2 className="font-display text-base font-semibold">{t('packages')}</h2>
    <p className="mb-2 text-xs text-faint">{t('packagesHint')}</p>
    <Link href="/captain/billing/packages" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex items-center text-sm min-h-12 px-4" })}>{tiers('manage')}</Link>
    {packages.length ? <ul>{packages.map(item => <li key={item.id} className="border-t border-line-soft first:border-0">
      <Button variant="secondary" type="button" onClick={() => setPanel('manage')} className="flex min-h-12 w-full items-center gap-2.5 py-3 text-start text-[13px]">
        <span className="min-w-0 flex-1 break-words">{item.name}</span><b className="font-display tabular-nums">{formatNumber(item.price_egp, locale)}</b><span>{t('currency')}</span>
      </Button></li>)}</ul> : <p className="py-3 text-xs text-faint">{legacy('noPackages')}</p>}
    <Button type="button" variant={'secondary'} block={false} className={"mt-2 min-h-12 w-full text-[13px]"} onClick={() => setPanel('add')}>{t('addPackage')}</Button>
    {panel && <ResponsiveDialog modal fallbackId="billing-heading" onDismiss={() => setPanel(null)} aria-labelledby="package-panel-title"
      className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-5 text-ink backdrop:bg-bg-deep/80">
      <header className="mb-3 flex items-center justify-between gap-3"><h2 id="package-panel-title" className="font-display text-[19px] font-semibold">{t('packages')}</h2>
        <Button type="button" aria-label={legacy('closeCollect')} onClick={() => setPanel(null)} variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center"}><X aria-hidden className="size-5" /></Button></header>
      <PackagesCard packages={packages} onChange={onChange} initialAdding={panel === 'add'} />
    </ResponsiveDialog>}
  </section>;
}

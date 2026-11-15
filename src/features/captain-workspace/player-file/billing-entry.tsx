'use client';
import { IconButton } from '@/ui/icon-button';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from './messages';

const Billing = dynamic(() => import('@/features/billing').then(module => module.BillingManagerLoader), {
  ssr: false, loading: () => <div aria-hidden className="glass-strong min-h-32 animate-pulse rounded-card" />,
});

export function FileBillingEntry({ playerId, name, today }: { playerId: string; name: string; today: string }) {
  const t = useT(messages);
  const [open, setOpen] = useState(false);
  return <>
    <Button id="file-renew" variant="secondary" className="min-h-12 rounded-full" onClick={() => setOpen(true)}>{t('renew')}</Button>
    {open && <ResponsiveDialog modal fallbackId="file-renew" onDismiss={() => setOpen(false)} aria-labelledby="file-billing-title"
      className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card border border-line-soft bg-surface p-card text-ink backdrop:bg-bg-deep/80">
      <div className="mb-card-gap flex items-center justify-between gap-stack"><h2 id="file-billing-title" className="font-display text-title font-semibold">{t('billing')}</h2>
        <IconButton aria-label={t('close')} onClick={() => setOpen(false)} className="min-h-12 min-w-12 rounded-full p-0"><X aria-hidden className="size-5" /></IconButton></div>
      <Billing playerId={playerId} name={name} today={today} />
    </ResponsiveDialog>}
  </>;
}

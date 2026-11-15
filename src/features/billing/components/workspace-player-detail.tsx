'use client';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../workspace/messages';
import type { BillingPlayer, Package } from '../types';
import { PlayerBillingRow } from './player-billing-row';
import { BillingManagerCard } from './billing-manager-card';
import { PaymentHistory } from './payment-history';
import { Button } from '@/ui/button';

export function WorkspacePlayerDetail({ player, today, packages, initialAction, onClose }: {
  player: BillingPlayer; today: string; packages: Package[]; initialAction: 'history' | 'renew' | 'collect' | 'activate'; onClose: () => void;
}) {
  const t = useT(messages);
  return <ResponsiveDialog modal fallbackId="billing-heading" onDismiss={onClose} aria-labelledby="billing-detail-title"
    className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-card text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-2xl sm:rounded-card">
    <header className="mb-card-gap flex items-center justify-between gap-stack"><h2 id="billing-detail-title" className="font-display text-title font-semibold">{player.fullName}</h2>
      <Button type="button" aria-label={t('close')} onClick={onClose} variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center"}><X aria-hidden className="size-5" /></Button></header>
    <div className="space-y-card-gap">
      {!player.phone && <p className="text-xs text-faint">{t('noPhone')}</p>}
      <ul><PlayerBillingRow workspace player={player} today={today} packages={packages} initialAction={initialAction === 'renew' || initialAction === 'collect' ? initialAction : undefined} /></ul>
      <BillingManagerCard workspace playerId={player.playerId} name={player.fullName} today={today} autoActivate={initialAction === 'activate'} />
      <PaymentHistory playerId={player.playerId} />
    </div>
  </ResponsiveDialog>;
}

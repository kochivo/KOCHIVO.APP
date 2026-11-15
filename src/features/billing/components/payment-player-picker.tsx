'use client';
import { Button } from '@/ui/button';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../payments/messages';
import { messages as workspaceMessages } from '../workspace/messages';
import type { BillingPlayer } from '../types';

export function PaymentPlayerPicker({ players, onChoose, onClose }: { players: BillingPlayer[]; onChoose: (player: BillingPlayer) => void; onClose: () => void }) {
  const t = useT(messages), workspace = useT(workspaceMessages);
  const [search, setSearch] = useState('');
  const shown = players.filter(player => player.fullName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <ResponsiveDialog modal fallbackId="billing-heading" onDismiss={onClose} aria-labelledby="payment-picker-title"
    className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-5 text-ink backdrop:bg-bg-deep/80">
    <header className="mb-3 flex items-center justify-between gap-3"><h2 id="payment-picker-title" className="font-display text-[19px] font-semibold">{t('choosePlayer')}</h2>
      <Button type="button" onClick={onClose} aria-label={workspace('close')} variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center"}><X aria-hidden className="size-5" /></Button></header>
    <input aria-label={t('search')} placeholder={t('search')} value={search} onChange={event => setSearch(event.target.value)} className="mb-3 min-h-12 w-full rounded-full border border-line bg-surface-raised px-4" />
    {shown.length ? <ul>{shown.map(player => <li key={player.playerId} className="border-t border-line-soft"><Button variant="secondary" type="button" className="min-h-12 w-full px-3 text-start" onClick={() => onChoose(player)}>{player.fullName}</Button></li>)}</ul>
      : <p className="text-sm text-faint">{t('noMatches')}</p>}
  </ResponsiveDialog>;
}

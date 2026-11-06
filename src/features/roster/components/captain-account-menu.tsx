'use client';

import { useId, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, CreditCard, Settings, UserRound } from 'lucide-react';
import { useT } from '@/core/i18n';
import { messages } from '../messages';

export function CaptainAccountMenu() {
  const t = useT(messages);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = () => panel.current?.hidePopover();
  return <div className="lg:hidden">
    <button type="button" popoverTarget={id} className="press glass flex min-h-12 items-center gap-2 rounded-control px-3 text-sm font-bold text-ink">
      <UserRound className="size-5" aria-hidden="true" />{t('accountMenu')}<ChevronDown className="size-4 text-muted" aria-hidden="true" />
    </button>
    <div ref={panel} id={id} popover="auto" className="sheet fixed inset-auto end-4 top-[calc(var(--captain-top-inset)+3.5rem)] m-0 w-60 max-w-[calc(100vw-2rem)] rounded-card border border-line p-2 text-ink shadow-xl lg:hidden">
      <nav aria-label={t('accountMenu')} className="flex flex-col gap-1">
        <Link href="/captain/settings" onClick={close} className="press flex min-h-12 items-center gap-3 rounded-control px-3 text-sm font-bold hover:bg-lime-soft focus-visible:outline-2 focus-visible:outline-lime">
          <Settings className="size-5 text-muted" aria-hidden="true" />{t('settings')}
        </Link>
        <Link href="/captain/billing" onClick={close} className="press flex min-h-12 items-center gap-3 rounded-control px-3 text-sm font-bold hover:bg-lime-soft focus-visible:outline-2 focus-visible:outline-lime">
          <CreditCard className="size-5 text-muted" aria-hidden="true" />{t('subscriptions')}
        </Link>
      </nav>
    </div>
  </div>;
}

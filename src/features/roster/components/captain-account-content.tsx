'use client';

import Link from 'next/link';
import { CreditCard, Settings } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { accountMessages } from './captain-account-messages';

export function CaptainAccountContent({ onNavigate }: { onNavigate: () => void }) {
  const t = useT(accountMessages);
  const linkClass = captainWorkspaceEnabled()
    ? 'press glass flex min-h-12 items-center gap-3 rounded-full border border-line px-3 text-sm font-bold hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-lime'
    : 'press flex min-h-12 items-center gap-3 rounded-control px-3 text-sm font-bold hover:bg-lime-soft focus-visible:outline-2 focus-visible:outline-lime';
  return <nav aria-label={t('accountMenu')} className="flex flex-col gap-1">
    <Link href="/captain/settings" onClick={onNavigate} className={linkClass}>
      <Settings className="size-5 text-muted" aria-hidden="true" />{t('settings')}
    </Link>
    <Link href="/captain/billing" onClick={onNavigate} className={linkClass}>
      <CreditCard className="size-5 text-muted" aria-hidden="true" />{t('subscriptions')}
    </Link>
  </nav>;
}

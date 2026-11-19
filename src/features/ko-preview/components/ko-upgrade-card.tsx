'use client';

import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import type { KoUpgrade } from '@/features/ko-core';
import { Button, buttonClass } from '@/ui/button';
import Link from 'next/link';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages } from '../messages';

export function KoUpgradeCard({ upgrade }: { upgrade: KoUpgrade }) {
  const t = useT(messages);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return <div className="space-y-inline rounded-control border border-line p-stack">
    <p className="text-sm font-bold">{t('upgradeTitle')}</p>
    <div className="flex items-center justify-between gap-inline">
      <span>{t(`upgradeTier.${upgrade.tier}`)}</span>
      <span className="tabular-nums text-muted">{t('upgradeMonthlyCredits', { credits: upgrade.credits })}</span>
    </div>
    <div className="flex flex-wrap gap-inline">
      <Link href={captainWorkspaceEnabled() ? '/captain/settings' : '/captain/billing'}
        className={buttonClass({ variant: 'secondary', block: false, className: 'inline-flex min-h-12 items-center px-page-x text-sm' })}>
        {t('upgrade')}
      </Link>
      <Button type="button" variant="secondary" block={false} className="min-h-12 px-page-x text-sm text-muted" onClick={() => setDismissed(true)}>
        {t('later')}
      </Button>
    </div>
  </div>;
}

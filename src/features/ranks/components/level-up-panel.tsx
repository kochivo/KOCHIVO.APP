'use client';

import { useId } from 'react';
import { useT } from '@/core/i18n/client';
import { Button, RankBadge } from '@/ui';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { Tier } from '../types';
import { messages } from '../messages';

export function LevelUpPanel({ tier, onClose }: { tier: Tier; onClose: () => void }) {
  const t = useT(messages);
  const title = useId();
  return <ResponsiveDialog modal fallbackId="rank-title" onDismiss={onClose} aria-labelledby={title}
    className="glass-strong m-auto w-full max-w-sm rounded-card p-6 motion-reduce:animate-none motion-reduce:transition-none">
    <div className="flex flex-col items-center gap-5 text-center">
      <RankBadge tier={tier} size="xl" label={t(tier)} />
      <h2 id={title} className="text-2xl font-extrabold">{t('celebration', { tier: t(tier) })}</h2>
      <Button className="min-h-12 w-full" onClick={onClose}>{t('continue')}</Button>
    </div>
  </ResponsiveDialog>;
}

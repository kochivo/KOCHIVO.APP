'use client';

import { useId } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui';
import { Medal } from '@/ui/medal';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { Tier } from '../types';
import { messages } from '../messages';
import { ShareRankButton } from './share-rank-button';

export function LevelUpPanel({ tier, stars = 0, onClose }: { tier: Tier; stars?: number; onClose: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const n = formatNumber(stars, locale);
  const starred = tier === 'legend' && stars > 0;
  const title = useId();
  return <ResponsiveDialog modal fallbackId="rank-title" onDismiss={onClose} aria-labelledby={title}
    className="sheet m-auto w-full max-w-sm rounded-card border border-line p-section text-ink backdrop:bg-bg-deep/80 motion-reduce:animate-none motion-reduce:transition-none">
    <div className="flex flex-col items-center gap-card-gap text-center">
      <Medal rank={({ beginner: 0, champion: 1, elite: 3, legend: 6 } as const)[tier]} size={190} label={starred ? t('legendWithStars', { n }) : t(tier)} />
      <h2 id={title} className="text-2xl font-extrabold">{starred ? t('starCelebration', { n }) : t('celebration', { tier: t(tier) })}</h2>
      <Button className="min-h-12 w-full" onClick={onClose}>{t('continue')}</Button>
      <ShareRankButton kind="rank" />
    </div>
  </ResponsiveDialog>;
}

'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Medal } from '@/ui/medal';
import { Button } from '@/ui/button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { Celebration } from '../level-up';
import { messages } from '../messages';
import { ShareRankButton } from './share-rank-button';

export function MedalUnlock({ item, onClose }: { item: Celebration; onClose: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const title = item.stars ? t('starCelebration', { n: formatNumber(item.stars, locale) })
    : item.medal ? t('became', { rank: t(item.medal) }) : t('medalUnlock');
  return <ResponsiveDialog modal title={title} fallbackId="rank-title" onDismiss={onClose}
    className="sheet m-auto w-full max-w-sm rounded-card border border-line p-section text-ink backdrop:bg-bg-deep/80 motion-reduce:animate-none">
    <div className="flex flex-col items-center gap-card-gap text-center">
      <div className="enter motion-reduce:animate-none"><Medal rank={item.rank} emblem={item.emblem} size={190} label={title} /></div>
      {item.labelKey && <p className="text-sm text-muted">{t(item.labelKey)} · {item.streak ? t('streakStep') : formatNumber(item.threshold ?? 0, locale)}</p>}
      <Button block onClick={onClose}>{t('continue')}</Button>
      {item.medal && <ShareRankButton kind="rank" rankLabel />}
    </div>
  </ResponsiveDialog>;
}

'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Button } from '@/ui';
import { cn } from '@/lib/cn';
import { formatRest } from '../rest';

export function RestPanel({ remaining, flashing, onExtend, onSkip }: {
  remaining: number; flashing: boolean; onExtend: () => void; onSkip: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  return <section className={cn('glass-strong flex flex-col items-center gap-5 rounded-card px-4 py-10',
    flashing && 'motion-safe:animate-pulse motion-safe:bg-lime-soft')}>
    <h2 className="text-sm text-muted">{t('rest')}</h2>
    <output aria-label={t('restTimeRemaining')} aria-live="off" className="text-8xl font-extrabold tabular-nums"><bdi>{formatRest(remaining, locale)}</bdi></output>
    <p className="text-center text-sm text-muted">{t('yourPhoneWillVibrateAndTheScreen')}</p>
    <div className="flex gap-3">
      <Button variant="secondary" size="lg" className="min-h-16" onClick={onExtend}>{t('message30Sec')}</Button>
      <Button variant="secondary" size="lg" className="min-h-16" onClick={onSkip}>{t('skip')}</Button>
    </div>
  </section>;
}

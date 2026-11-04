'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Button } from '@/ui';
import { cn } from '@/lib/cn';
import { formatRest } from '../rest';

export function RestPanel({ remaining, total = remaining, sound = true, flashing, onExtend, onSkip, onToggleSound }: {
  remaining: number; total?: number; sound?: boolean; flashing: boolean;
  onExtend: () => void; onSkip: () => void; onToggleSound?: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  return <section className={cn('glass-strong flex flex-col items-center gap-5 rounded-card px-4 py-10',
    flashing && 'motion-safe:animate-pulse motion-safe:bg-lime-soft')}>
    <h2 className="text-sm text-muted">{t('rest')}</h2>
    <div className="relative grid size-64 place-items-center">
      <svg aria-hidden viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90" fill="none" strokeWidth="4">
        <circle cx="60" cy="60" r="56" stroke="currentColor" className="text-line" />
        <circle cx="60" cy="60" r="56" stroke="currentColor" pathLength="1" strokeDasharray="1"
          strokeDashoffset={1 - Math.min(1, Math.max(0, total > 0 ? remaining / total : 0))}
          className="text-lime motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-reduce:transition-none" />
      </svg>
      <output aria-label={t('restTimeRemaining')} aria-live="off" className="text-6xl font-extrabold tabular-nums"><bdi>{formatRest(remaining, locale)}</bdi></output>
    </div>
    <p className="text-center text-sm text-muted">{t('yourPhoneWillVibrateAndTheScreen')}</p>
    <div className="flex gap-3">
      <Button variant="secondary" size="lg" className="min-h-16" onClick={onExtend}>{t('message30Sec')}</Button>
      <Button variant="secondary" size="lg" className="min-h-16" onClick={onSkip}>{t('skip')}</Button>
    </div>
    <button type="button" aria-pressed={sound} onClick={onToggleSound}
      className={cn('min-h-12 min-w-12 rounded-control border px-3 text-sm', sound ? 'border-lime text-lime' : 'border-line text-muted')}>{t('sound')}</button>
  </section>;
}

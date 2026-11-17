'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Timer, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/ui';
import { IconButton } from '@/ui/icon-button';
import { cn } from '@/lib/cn';
import { formatRest } from '../rest';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function RestPanel({ remaining, total = remaining, sound = true, flashing, onExtend, onSkip, onToggleSound }: {
  remaining: number; total?: number; sound?: boolean; flashing: boolean;
  onExtend: () => void; onSkip: () => void; onToggleSound?: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  if (captainWorkspaceEnabled()) return <section className={cn('glass-strong flex flex-wrap items-center justify-between gap-inline rounded-card px-card py-stack',
    flashing && 'motion-safe:animate-pulse motion-safe:bg-lime-soft')}>
    <div className="flex items-center gap-inline">
      <Timer aria-hidden className="size-5 text-lime" />
      <div><h2 className="text-micro text-muted">{t('rest')}</h2>
        <output aria-label={t('restTimeRemaining')} aria-live="off" className="font-display text-h leading-none font-extrabold tabular-nums"><bdi>{formatRest(remaining, locale)}</bdi></output></div>
    </div>
    <div className="flex flex-wrap items-center gap-inline">
      <IconButton aria-label={t('sound')} aria-pressed={sound} onClick={onToggleSound}>
        {sound ? <Volume2 aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
      </IconButton>
      <Button variant="secondary" className="min-h-14 px-stack text-xs" onClick={onExtend}>{t('message30Sec')}</Button>
      <Button variant="secondary" className="min-h-14 px-stack text-xs" onClick={onSkip}>{t('skip')}</Button>
    </div>
  </section>;
  return <section className={cn('glass-strong flex flex-col items-center gap-card-gap rounded-card px-page-x py-section',
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
    <div className="flex gap-stack">
      <Button variant="secondary" size="lg" className="min-h-16" onClick={onExtend}>{t('message30Sec')}</Button>
      <Button variant="secondary" size="lg" className="min-h-16" onClick={onSkip}>{t('skip')}</Button>
    </div>
    <button type="button" aria-pressed={sound} onClick={onToggleSound}
      className={cn('min-h-12 min-w-12 rounded-control border px-stack text-sm', sound ? 'border-lime text-lime' : 'border-line text-muted')}>{t('sound')}</button>
  </section>;
}

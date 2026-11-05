'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import type { Pr } from '../pr';

type Props = {
  pr: Pr & { current: { weight_kg: number; reps: number } };
  onDismiss: () => void;
};

export function PrBurst({ pr, onDismiss }: Props) {
  const t = useT(messages);
  const locale = useLocale();
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [pr, onDismiss]);
  const format = (value: { weight_kg: number; reps: number }) => t('performance', { value0: formatNumber(value.weight_kg, locale), value1: formatNumber(value.reps, locale) });
  return <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-5">
    <div role="status" aria-live="polite" className="glass-strong pointer-events-auto relative rounded-card">
      <button type="button" onClick={onDismiss} aria-label={t('dismissNewRecord')}
        className="min-h-12 px-6 py-4 text-center">
        <span className="block text-xl font-bold text-lime">{t('newRecord')}</span>
        <span className="flex items-center justify-center gap-1"><bdi>{format(pr.previous)}</bdi><ArrowLeft aria-hidden className="dir-icon size-4" /><bdi className="font-bold">{format(pr.current)}</bdi></span>
      </button>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
        {Array.from({ length: 24 }, (_, index) => <span key={index}
          className={`kochivo-pr-confetti absolute top-0 h-2 w-1 motion-safe:animate-[kochivo-pr-fall_1.8s_ease-out_both] ${['bg-lime', 'bg-warn', 'bg-ink'][index % 3]}`}
          style={{ insetInlineStart: `${(index * 37) % 100}%`, animationDelay: `${index % 6 * 60}ms`,
            rotate: `${index * 47}deg` }} />)}
      </div>
      <style>{`@keyframes kochivo-pr-fall {
        from { transform: translateY(-12px) rotate(0deg); opacity: 1; }
        to { transform: translateY(130px) rotate(300deg); opacity: 0; }
      }`}</style>
    </div>
  </div>;
}

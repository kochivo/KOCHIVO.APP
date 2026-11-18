'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { Macros } from '@/lib/macros';
import { ProgressBar } from '@/ui/progress-bar';
import { messages } from '../player-v4/messages';
import { messages as nutritionMessages } from '../v6-messages';

const macros = { protein: '', carbs: '[&>div]:bg-warn [&>div]:bg-none', fat: '[&>div]:bg-info [&>div]:bg-none' } as const;

export function FoodMacroSummary({ eaten, target }: { eaten: Macros; target: Macros }) {
  const t = useT(messages), nutrition = useT(nutritionMessages), locale = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const progress = target.kcal > 0 ? Math.min(100, Math.max(0, eaten.kcal / target.kcal * 100)) : 0;
  const displayedCalories = target.kcal > 0 ? Math.max(0, target.kcal - eaten.kcal) : eaten.kcal;
  const caption = target.kcal <= 0 ? nutrition('kcal') : eaten.kcal > target.kcal
    ? nutrition('over', { value: number(eaten.kcal - target.kcal) }) : t('remaining');
  return <section data-food-section="macros" className="glass-strong flex items-center gap-card-gap rounded-card p-card" aria-label={nutrition('calories')}>
    <div className="relative size-26 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-ink/8" strokeWidth="3" />
        {progress > 0 && <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-lime" strokeWidth="3"
          pathLength="100" strokeLinecap="round" strokeDasharray={`${progress} 100`} />}
      </svg>
      <div className="absolute inset-0 grid content-center justify-items-center">
        <bdi className="engraved font-display text-stat leading-none">{number(displayedCalories)}</bdi>
        <span className="text-center text-micro text-muted">{caption}</span>
      </div>
    </div>
    <div className="min-w-0 flex-1 space-y-inline">
      {(['protein', 'carbs', 'fat'] as const).map(key => <div key={key}>
        <div className="flex flex-wrap justify-between gap-inline text-micro text-muted">
          <span>{nutrition(key)}</span><bdi className="font-display tabular-nums"><strong className="text-ink">{number(eaten[key])}</strong>/{number(target[key])}</bdi>
        </div>
        <ProgressBar thin value={eaten[key]} max={target[key]} className={macros[key]} aria-label={nutrition(key)} />
      </div>)}
    </div>
  </section>;
}

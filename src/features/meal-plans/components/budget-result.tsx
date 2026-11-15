'use client';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { messages } from '../budget/messages';
import { KoMealPlans } from '@/ui/icons/ko-meal-plans';
import type { BudgetDay } from '../budget-plan';

export function BudgetResult({ day, onApply, playerId }: { day: BudgetDay; onApply: (reduce?: boolean) => void; playerId: string }) {
  const t = useT(messages), locale = useLocale();
  return <div className="space-y-stack">
    <p className="text-lime"><bdi>{t('money', { n: formatNumber(day.costEgp, locale) })}</bdi></p>
    {day.shortBy > 0 ? <div className="space-y-stack rounded-card bg-warn-soft p-card text-warn" role="alert">
      <p>{t('short', { n: formatNumber(day.shortBy, locale) })}</p>
      <Button variant="secondary" onClick={() => onApply(true)}>{t('reduce', { n: formatNumber(Math.floor(day.macros.protein), locale) })}</Button>
      <Link href={`/captain/players/${encodeURIComponent(playerId)}/chat`} className={buttonClass({ variant: 'secondary' })}>{t('contact')}</Link>
    </div> : <>{!day.feasible && <p role="alert" className="rounded-control bg-warn-soft p-card text-warn">{t('calorieShort')}</p>}<Button onClick={() => onApply()}><KoMealPlans aria-hidden className="size-5" />{t('use')}</Button></>}
  </div>;
}

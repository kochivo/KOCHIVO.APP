'use client';
import Link from 'next/link';
import { Dumbbell, Utensils, TrendingUp, UserRound } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../warmup/messages';

const items = [
  { key: 'workout', href: '/player', icon: Dumbbell },
  { key: 'food', href: '/player/nutrition', icon: Utensils },
  { key: 'progress', href: '/player/progress', icon: TrendingUp },
  { key: 'account', href: '/player/settings', icon: UserRound },
] as const;

export function WarmupNav() {
  const t = useT(messages);
  return <nav aria-label={t('navigation')} className="-mx-[18px] mt-auto flex justify-around border-t border-line-soft px-[18px] pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
    {items.map(({ key, href, icon: Icon }) => <Link key={key} href={href} aria-current={key === 'workout' ? 'page' : undefined}
      className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 px-2 text-[11px] ${key === 'workout' ? 'text-lime' : 'text-faint'}`}>
      <Icon aria-hidden className="size-5" />{t(key)}
    </Link>)}
  </nav>;
}

'use client';
import Link from 'next/link';
import { Dumbbell, Utensils, TrendingUp, UserRound } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../warmup/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { KoHome, KoPlayerFood, KoProgress, KoSettings } from '@/ui/icons';

const items = [
  { key: 'workout', href: '/player', icon: Dumbbell, v3Icon: KoHome },
  { key: 'food', href: '/player/nutrition', icon: Utensils, v3Icon: KoPlayerFood },
  { key: 'progress', href: '/player/progress', icon: TrendingUp, v3Icon: KoProgress },
  { key: 'account', href: '/player/settings', icon: UserRound, v3Icon: KoSettings },
] as const;

export function WarmupNav() {
  const t = useT(messages);
  const v3 = captainWorkspaceEnabled();
  return <nav aria-label={t('navigation')} className="-mx-[18px] mt-auto flex justify-around border-t border-line-soft px-[18px] pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
    {items.map(({ key, href, icon, v3Icon }) => {
      const Icon = v3 ? v3Icon : icon;
      return <Link key={key} href={href} aria-current={key === 'workout' ? 'page' : undefined}
      className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 px-2 text-[11px] ${key === 'workout' ? 'text-lime' : 'text-faint'}`}>
      <Icon aria-hidden className="size-5" />{t(key)}
    </Link>; })}
  </nav>;
}

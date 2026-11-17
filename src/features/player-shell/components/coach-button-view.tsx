'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

export function CoachButtonView({ name, avatarUrl, unread = 0, loading = false }: {
  name?: string; avatarUrl?: string | null; unread?: number; loading?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const count = formatNumber(unread, locale);
  return <Link href="/player/captain" aria-label={unread > 0 ? t('v4CoachUnread', { count }) : t('v4CoachChat')}
    aria-busy={loading || undefined} className="press relative grid min-h-12 min-w-12 shrink-0 place-items-center rounded-full">
    <span aria-hidden className="relative grid size-11 place-items-center overflow-hidden rounded-full border-2 border-lime bg-surface-raised text-title font-bold text-ink">
      {avatarUrl ? <Image src={avatarUrl} alt="" width={44} height={44} className="size-full object-cover" unoptimized /> : name?.trim().slice(0, 1)}
    </span>
    <span aria-hidden className="absolute bottom-0 start-0 grid size-5 place-items-center rounded-md bg-surface-raised text-lime">
      <MessageCircle className="size-3" strokeWidth={1.5} />
    </span>
    {unread > 0 && <span data-unread aria-hidden className="absolute end-0 top-0 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-lime font-display text-micro font-bold text-on-lime">{count}</span>}
  </Link>;
}

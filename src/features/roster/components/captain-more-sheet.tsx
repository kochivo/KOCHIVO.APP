'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Search, X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource/use-resource';
import { formatNumber } from '@/lib/format';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { Button, buttonClass } from '@/ui/button';
import { KoCaptainChat } from '@/ui/icons/ko-captain-chat';
import { CaptainNavGroups } from './captain-nav-groups';
import { frameMessages } from './captain-frame-messages';
import type { FrameCounts, FrameId } from './captain-frame-model';
import type { CaptainFrameData } from './captain-frame-data';
import { phoneMessages } from './captain-phone-messages';
import { loadCaptainMoreCounts } from './captain-more-counts';

const FeedbackButton = dynamic(() => import('@/features/feedback').then(module => module.FeedbackButton), { ssr: false });

export function CaptainMoreSheet({ active, counts, captain, plan, bell, tools, onClose }: {
  active: FrameId; counts: FrameCounts; captain?: CaptainFrameData['captain'];
  plan?: { tier: string; used: number; limit: number } | null; bell?: ReactNode; tools?: ReactNode; onClose: () => void;
}) {
  const t = useT(frameMessages);
  const phone = useT(phoneMessages);
  const locale = useLocale();
  const library = useResource('captain:phone-more-counts', loadCaptainMoreCounts);
  const failed = library.error || library.data === null || (library.data && Object.values(library.data).some(count => count === null));
  const tier = plan?.tier;
  const planName = tier === 'entry' || tier === 'champion' || tier === 'legend' || tier === 'empire' ? phone(tier) : tier;
  return <ResponsiveDialog modal aria-label={t('more')} fallbackId="captain-more" openerId="captain-more" onDismiss={onClose}
    className="sheet fixed inset-x-0 top-[var(--safe-top)] bottom-[calc(5.5rem+var(--safe-bottom))] m-0 max-h-none w-full max-w-none space-y-card-gap overflow-y-auto rounded-none! border-0! bg-bg! bg-none! px-page-x pb-card text-ink shadow-none! before:content-none! backdrop:bg-transparent! backdrop:backdrop-blur-none!">
    <header className="flex flex-nowrap items-center gap-inline">
      <h2 className="me-auto min-w-0 truncate text-h font-bold">{t('more')}</h2>
      <Link href="/captain/inbox" prefetch={false} aria-label={t('inbox')} onClick={onClose}
        className={buttonClass({ variant: 'secondary', block: false, className: 'relative size-12 px-0' })}>
        <KoCaptainChat className="size-5" aria-hidden />
        {!!counts.inbox && <span className="absolute end-0 top-0 rounded-full bg-lime px-inline text-micro font-bold tabular-nums text-on-lime">{counts.inbox}</span>}
      </Link>
      <Button id="captain-more-search" variant="secondary" block={false} className="size-12 px-0" aria-label={t('search')}
        onClick={() => { onClose(); document.getElementById('captain-search')?.click(); }}>
        <Search className="size-5" aria-hidden />
      </Button>
      {bell && <div className="shrink-0" onClickCapture={onClose}>{bell}</div>}
      <button type="button" onClick={onClose} aria-label={t('close')} className="press grid min-h-12 min-w-12 cursor-pointer place-items-center rounded-control focus-visible:ring-2 focus-visible:ring-lime"><X className="size-5" aria-hidden /></button>
    </header>
    <Link href="/captain/settings" prefetch={false} onClick={onClose} className="glass press flex min-h-12 items-center gap-card-gap rounded-card p-card focus-visible:ring-2 focus-visible:ring-lime">
      {captain?.avatar ? <Image src={captain.avatar} alt="" width={52} height={52} unoptimized className="size-[52px] shrink-0 rounded-full object-cover ring-2 ring-lime" />
        : <span aria-hidden className="grid size-[52px] shrink-0 place-items-center rounded-full bg-surface-raised text-title font-bold ring-2 ring-lime">{captain?.name.slice(0, 1)}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-md font-bold">{captain?.name ?? t('settingsAccount')}</p>
        <p className="text-xs text-muted">{plan && planName ? phone('usage', { plan: planName, used: formatNumber(plan.used, locale), limit: formatNumber(plan.limit, locale) }) : t('unavailable')}</p>
      </div>
      <ChevronLeft className="dir-icon size-4 shrink-0 text-muted" aria-hidden />
    </Link>
    <CaptainNavGroups active={active} counts={counts} libraryCounts={library.data} phone onNavigate={onClose} />
    {!library.data && !failed && <p role="status" className="text-xs text-muted">{t('loading')}</p>}
    {failed && <div className="flex items-center justify-between gap-inline">
      <p role="status" className="text-xs text-muted">{t('unavailable')}</p>
      <Button variant="secondary" block={false} onClick={() => void library.retry()}>{t('retry')}</Button>
    </div>}
    <div className="flex flex-wrap items-center gap-inline">
      <FeedbackButton role="captain" placement="more" />
      {tools}
    </div>
  </ResponsiveDialog>;
}

import type { ReactNode } from 'react';
import Link from 'next/link';
import { KoSettings } from '@/ui/icons/ko-settings';
import { useT } from '@/core/i18n/client';
import { frameItems } from './captain-frame-model';
import type { FrameCounts, FrameId } from './captain-frame-model';
import { frameMessages } from './captain-frame-messages';
import { CaptainNavGroups } from './captain-nav-groups';
import { CaptainPhoneNav } from './captain-phone-nav';

export function CaptainFrameNavView({ active, counts, open, onMore, onClose, onSelect, more, available, adding = false, onQuickAdd }: {
  active: FrameId; counts: FrameCounts; open: boolean; onMore: () => void; onClose: () => void;
  onSelect?: (id: FrameId) => void; more?: ReactNode; available?: readonly FrameId[];
  adding?: boolean; onQuickAdd?: () => void;
}) {
  const t = useT(frameMessages);
  const mobile = frameItems.filter(item => item.mobile && item.available);
  return <>
    <div className={onQuickAdd ? 'hidden min-[760px]:block max-md:hidden' : 'hidden min-[760px]:block'}><CaptainNavGroups active={active} counts={counts} onSelect={onSelect} available={available} /></div>
    {onQuickAdd ? <CaptainPhoneNav active={active} tasks={counts.tasks} open={open} adding={adding} onMore={onMore} onQuickAdd={onQuickAdd} onClose={onClose} /> :
    <nav aria-label={t('work')} className="glass-strong fixed inset-x-3 bottom-[calc(0.875rem+var(--safe-bottom))] z-40 flex h-[62px] items-center justify-around rounded-full border border-line px-inline min-[760px]:hidden">
      {mobile.map(({ id, href, icon: Icon }) => {
        const count = id in counts ? counts[id as keyof FrameCounts] : null;
        return <Link prefetch={false} key={id} href={onSelect ? `#${href}` : href} onClick={event => { onClose(); if (onSelect) { event.preventDefault(); onSelect(id); } }} aria-current={active === id && !open ? 'page' : undefined}
          className={`relative flex min-h-12 min-w-12 flex-col items-center justify-center gap-inline rounded-full px-inline text-micro ${active === id && !open ? 'bg-lime-soft text-lime' : 'text-muted'}`}>
          <Icon active={active === id && !open} className="size-5" aria-hidden />{t(id === 'inbox' ? 'mobileInbox' : id)}
          {count !== null && count > 0 && <span className="absolute end-0 top-0 rounded-full bg-lime px-inline text-micro font-bold tabular-nums text-on-lime">{count}</span>}
        </Link>;
      })}
      <button id="captain-more" type="button" aria-expanded={open} aria-haspopup="dialog" onClick={onMore}
        className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-inline rounded-full px-inline text-micro ${open || !mobile.some(item => item.id === active) ? 'bg-lime-soft text-lime' : 'text-muted'}`}>
        <KoSettings active={open || !mobile.some(item => item.id === active)} className="size-5" aria-hidden />{t('more')}
      </button>
    </nav>}
    {more}
  </>;
}

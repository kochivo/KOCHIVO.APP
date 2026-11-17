'use client';

import Link from 'next/link';
import { useT } from '@/core/i18n/client';
import { frameMessages } from './captain-frame-messages';
import { frameGroups, frameItems, sidebarHiddenGroups } from './captain-frame-model';
import type { FrameCounts, FrameId } from './captain-frame-model';

export function CaptainNavGroups({ active, counts, tiles = false, onNavigate, onSelect, available }: {
  active: FrameId; counts: FrameCounts; tiles?: boolean; onNavigate?: () => void; onSelect?: (id: FrameId) => void; available?: readonly FrameId[];
}) {
  const t = useT(frameMessages);
  return <nav aria-label={t('more')}>
    {frameGroups.filter(group => tiles || !sidebarHiddenGroups.includes(group)).map(group => {
      const items = frameItems.filter(item => item.available && item.group === group && (!tiles || !item.mobile) && (!available || available.includes(item.id)));
      return items.length ? <div key={group}>
        <h2 className="px-stack pt-stack text-micro font-normal text-faint">{t(group)}</h2>
        <div className={tiles ? 'grid grid-cols-3 gap-inline' : undefined}>
          {items.map(({ id, href, icon: Icon }) => {
            const count = id in counts ? counts[id as keyof FrameCounts] : undefined;
            return <Link prefetch={false} key={id} href={onSelect ? `#${href}` : href} onClick={event => {
              onNavigate?.();
              if (onSelect) { event.preventDefault(); onSelect(id); }
            }} aria-current={active === id ? 'page' : undefined}
              className={`relative flex min-h-12 rounded-control text-row ${tiles ? `glass min-h-[72px] flex-col items-center justify-center gap-stack px-stack py-stack text-center ${active === id ? 'glass-strong font-semibold text-ink' : 'text-muted'}` : `items-center gap-stack px-stack ${active === id ? 'nav-slash bg-ink/5 font-semibold text-ink' : 'text-muted hover:bg-ink/5 hover:text-ink'}`}`}>
              <Icon active={active === id} className={`size-5 shrink-0 ${tiles ? 'text-lime' : ''}`} aria-hidden />
              <span className={tiles ? undefined : 'min-w-0 flex-1 truncate'}>{t(id)}</span>
              {count === null ? <span className="sr-only">{t('unavailable')}</span> : count !== undefined && count > 0
                ? <span className={tiles ? 'absolute end-2 top-1 text-xs font-bold text-lime' : `min-w-5 rounded-md px-inline text-center text-micro font-bold tabular-nums ${id === 'billing' ? 'tone-warn' : 'tone-lime'}`}>{count}</span> : null}
            </Link>;
          })}
        </div>
      </div> : null;
    })}
  </nav>;
}

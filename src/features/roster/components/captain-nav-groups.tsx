'use client';

import Link from 'next/link';
import { useT } from '@/core/i18n/client';
import { frameMessages } from './captain-frame-messages';
import { frameGroups, frameItems } from './captain-frame-model';
import type { FrameCounts, FrameId } from './captain-frame-model';

export function CaptainNavGroups({ active, counts, tiles = false, onNavigate }: {
  active: FrameId; counts: FrameCounts; tiles?: boolean; onNavigate?: () => void;
}) {
  const t = useT(frameMessages);
  return <nav aria-label={t('more')}>
    {frameGroups.map(group => {
      const items = frameItems.filter(item => item.available && item.group === group && (!tiles || !item.mobile));
      return items.length ? <div key={group}>
        <h2 className="px-inline pb-inline pt-stack text-micro text-faint">{t(group)}</h2>
        <div className={tiles ? 'grid grid-cols-3 gap-inline' : 'space-y-inline'}>
          {items.map(({ id, href, icon: Icon }) => {
            const count = id in counts ? counts[id as keyof FrameCounts] : undefined;
            return <Link key={id} href={href} onClick={onNavigate} aria-current={active === id ? 'page' : undefined}
              className={`relative flex min-h-12 gap-stack rounded-control px-stack text-row ${tiles ? 'glass min-h-[72px] flex-col items-center justify-center py-stack text-center' : 'items-center'} ${active === id ? 'glass-strong font-semibold text-ink' : 'text-muted hover:bg-surface-raised hover:text-ink'}`}>
              <Icon active={active === id} className={`size-5 shrink-0 ${tiles || active === id ? 'text-lime' : ''}`} aria-hidden />
              {t(id)}
              {count === null ? <span className="sr-only">{t('unavailable')}</span> : count !== undefined && count > 0
                ? <span className={tiles ? 'absolute end-2 top-1 text-xs font-bold text-lime' : 'ms-auto rounded-full bg-lime px-inline text-xs font-bold tabular-nums text-on-lime'}>{count}</span> : null}
            </Link>;
          })}
        </div>
      </div> : null;
    })}
  </nav>;
}

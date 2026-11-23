'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { frameMessages } from './captain-frame-messages';
import { frameGroups, frameItems, sidebarHiddenGroups } from './captain-frame-model';
import type { FrameCounts, FrameId } from './captain-frame-model';

export function CaptainNavGroups({ active, counts, libraryCounts, tiles = false, phone = false, onNavigate, onSelect, available }: {
  active: FrameId | null; counts: FrameCounts; tiles?: boolean; phone?: boolean; onNavigate?: () => void; onSelect?: (id: FrameId) => void; available?: readonly FrameId[];
  libraryCounts?: Partial<Record<FrameId, number | null>> | null;
}) {
  const t = useT(frameMessages);
  const locale = useLocale();
  if (phone) return <nav aria-label={t('more')} className="space-y-stack">
    {frameGroups.filter(group => group !== 'work').map(group => <section key={group}>
      <h3 className="mb-stack ps-inline text-micro text-muted">{group === 'account' ? t('account') : t(group)}</h3>
      <div className="glass divide-y divide-line-soft overflow-hidden rounded-card">
        {frameItems.filter(item => item.available && item.group === group && !item.mobile).map(({ id, href, icon: Icon }) => {
          const count = id in counts ? counts[id as keyof FrameCounts] : libraryCounts?.[id] ?? null;
          return <Link key={id} href={href} prefetch={false} onClick={onNavigate} aria-current={active === id ? 'page' : undefined}
            className={`press flex min-h-[50px] items-center gap-card-gap px-card text-sm focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime ${active === id ? 'nav-slash font-semibold' : ''}`}>
            <Icon active={active === id} className="size-[18px] shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">{t(id)}</span>
            {count !== null && <span className="text-xs tabular-nums text-muted">{formatNumber(count, locale)}</span>}
            <ChevronLeft className="dir-icon size-4 shrink-0 text-muted" aria-hidden />
          </Link>;
        })}
      </div>
    </section>)}
  </nav>;
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
              {count != null && count > 0
                ? <span className={tiles ? 'absolute end-2 top-1 text-xs font-bold text-lime' : `min-w-5 rounded-md px-inline text-center text-micro font-bold tabular-nums ${id === 'billing' ? 'tone-warn' : 'tone-lime'}`}>{count}</span> : null}
            </Link>;
          })}
        </div>
      </div> : null;
    })}
  </nav>;
}

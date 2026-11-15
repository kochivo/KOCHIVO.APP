'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { KoSettings } from '@/ui/icons/ko-settings';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource/use-resource';
import { loadCaptainFrameCounts } from './captain-frame-data';
import { frameItems, frameParent } from './captain-frame-model';
import type { FrameCounts } from './captain-frame-model';
import { frameMessages } from './captain-frame-messages';
import { CaptainNavGroups } from './captain-nav-groups';
import { LoadingState } from '@/ui/loading-state';
import { useTaskCount } from '../hooks/use-task-count';

const CaptainMoreSheet = dynamic(() => import('./captain-more-sheet').then(module => module.CaptainMoreSheet), {
  loading: () => <LoadingState />,
});

export function CaptainFrameNav({ counts: initialCounts }: { counts: FrameCounts }) {
  const load = useCallback(() => loadCaptainFrameCounts(), []);
  const resource = useResource('captain:frame-counts', load, { pollMs: 30_000 });
  const live = resource.error ? { inbox: null, join: null, billing: null } : resource.data ?? initialCounts;
  const path = usePathname();
  const tasks = useTaskCount(path, useLocale());
  const counts = { ...live, tasks };
  const t = useT(frameMessages);
  const active = frameParent(path);
  const [sheetPath, setSheetPath] = useState<string | null>(null);
  const open = sheetPath === path;
  const mobile = frameItems.filter(item => item.mobile && item.available);
  return <>
    <div className="hidden min-[760px]:block"><CaptainNavGroups active={active} counts={counts} /></div>
    <nav aria-label={t('work')} className="glass-strong fixed inset-x-3 bottom-[calc(0.875rem+var(--safe-bottom))] z-40 flex h-[62px] items-center justify-around rounded-full border border-line px-inline min-[760px]:hidden">
      {mobile.map(({ id, href, icon: Icon }) => {
        const count = id in counts ? counts[id as keyof FrameCounts] : null;
        return <Link key={id} href={href} onClick={() => setSheetPath(null)} aria-current={active === id && !open ? 'page' : undefined}
          className={`relative flex min-h-12 min-w-12 flex-col items-center justify-center gap-inline rounded-full px-inline text-micro ${active === id && !open ? 'bg-lime-soft text-lime' : 'text-muted'}`}>
          <Icon active={active === id && !open} className="size-5" aria-hidden />{t(id === 'inbox' ? 'mobileInbox' : id)}
          {count !== null && count > 0 && <span className="absolute end-0 top-0 rounded-full bg-lime px-inline text-micro font-bold tabular-nums text-on-lime">{count}</span>}
        </Link>;
      })}
      <button id="captain-more" type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setSheetPath(path)}
        className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-inline rounded-full px-inline text-micro ${open || !mobile.some(item => item.id === active) ? 'bg-lime-soft text-lime' : 'text-muted'}`}>
        <KoSettings active={open || !mobile.some(item => item.id === active)} className="size-5" aria-hidden />{t('more')}
      </button>
    </nav>
    {open && <CaptainMoreSheet active={active} counts={counts} onClose={() => setSheetPath(null)} />}
  </>;
}

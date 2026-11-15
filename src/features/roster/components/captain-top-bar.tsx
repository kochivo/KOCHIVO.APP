'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { frameMessages } from './captain-frame-messages';
import { frameParent } from './captain-frame-model';
import { LoadingState } from '@/ui/loading-state';
import type { CaptainFrameData } from './captain-frame-data';
import { pageBarTargets } from '@/ui/page-bar-slot';
import { Button } from '@/ui/button';

const CaptainSearchPalette = dynamic(() => import('./captain-search-palette').then(module => module.CaptainSearchPalette), {
  loading: () => <LoadingState />,
});

export function CaptainTopBar({ players, bell, install }: { players: CaptainFrameData['players']; bell: ReactNode; install: ReactNode }) {
  const t = useT(frameMessages);
  const path = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpenPath(value => value === path ? null : path);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [path]);
  const title = path.startsWith('/captain/players/') ? 'player' : path === '/captain/billing/packages' ? 'packages' : frameParent(path);
  return <>
    <div className="glass mb-stack flex min-h-16 flex-wrap items-center gap-inline rounded-control border border-line px-inline py-inline">
      <div key={`title:${path}`} data-top-bar-title className="min-w-0 grow basis-48 ps-inline">
        <div id={pageBarTargets.title} data-page-bar-title className="peer empty:hidden" />
        <h2 className="text-base font-semibold peer-[:not(:empty)]:hidden">{t(title)}</h2>
      </div>
      <Button id="captain-search" type="button" aria-label={t('search')} aria-haspopup="dialog" aria-expanded={openPath === path}
        onClick={() => setOpenPath(path)} variant={'secondary'} block={false} className={"ms-auto flex min-h-12 min-w-12 items-center justify-center gap-inline bg-surface-raised px-stack text-xs text-faint min-[760px]:w-[240px] min-[760px]:justify-start"}>
        <Search className="size-4 shrink-0" aria-hidden /><span className="hidden min-[760px]:inline">{t('search')}</span>
        <kbd dir="ltr" className="ms-auto hidden rounded bg-bg px-inline py-inline text-micro text-muted min-[760px]:inline">{t('shortcut')}</kbd>
      </Button>
      {bell}
      <div className="flex max-w-full flex-wrap items-center gap-inline">
        <div key={`actions:${path}`} id={pageBarTargets.actions} className="flex max-w-full flex-wrap items-center gap-inline empty:hidden" />
        {install}
      </div>
    </div>
    {openPath === path && <CaptainSearchPalette players={players} onClose={() => setOpenPath(null)} />}
  </>;
}

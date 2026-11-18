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

const ownPhoneSearch = new Set(['/captain/players', '/captain/library/meal-plans', '/captain/library/foods']);

export function CaptainTopBar({ players, bell, install }: { players: CaptainFrameData['players']; bell: ReactNode; install: ReactNode }) {
  const t = useT(frameMessages);
  const path = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [searchOpener, setSearchOpener] = useState('captain-search');
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpener(document.getElementById('captain-search')?.getClientRects().length ? 'captain-search' : 'captain-more');
        setOpenPath(value => value === path ? null : path);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [path]);
  const title = path.startsWith('/captain/players/') ? 'player' : path === '/captain/billing/packages' ? 'packages' : frameParent(path);
  return <>
    <div data-captain-top-bar className="group/top glass mb-stack flex min-h-16 flex-wrap items-center gap-inline rounded-control border border-line px-inline py-inline max-md:min-h-12 max-md:flex-nowrap max-md:rounded-none max-md:border-0 max-md:bg-transparent! max-md:bg-none max-md:p-0 max-md:shadow-none max-md:backdrop-blur-none max-md:group-has-[[data-captain-phone-heading]]/page:hidden">
      <div key={`title:${path}`} data-top-bar-title className="min-w-0 grow basis-48 ps-inline max-md:basis-auto max-md:ps-0">
        <div id={pageBarTargets.title} data-page-bar-title className="peer empty:hidden max-md:[&_h1]:truncate max-md:[&_p]:truncate" />
        <h2 className="text-base font-semibold peer-[:not(:empty)]:hidden max-md:truncate max-md:text-h max-md:font-bold">{t(title)}</h2>
      </div>
      <Button id="captain-search" type="button" aria-label={t('search')} aria-haspopup="dialog" aria-expanded={openPath === path}
        onClick={event => {
          setSearchOpener(event.currentTarget.getClientRects().length ? 'captain-search' : 'captain-more');
          setOpenPath(path);
        }} variant={'secondary'} block={false} className={`ms-auto flex min-h-12 min-w-12 items-center justify-center gap-inline bg-surface-raised px-stack text-xs text-faint min-[760px]:w-[240px] min-[760px]:justify-start max-md:w-12! max-md:justify-center! ${ownPhoneSearch.has(path) ? 'max-md:hidden' : path === '/captain' ? '' : 'max-md:group-has-[#page-bar-actions:not(:empty)]/top:hidden'}`.trim()}>
        <Search className="size-4 shrink-0" aria-hidden /><span className="hidden md:inline">{t('search')}</span>
        <kbd dir="ltr" className="ms-auto hidden rounded bg-bg px-inline py-inline text-micro text-muted md:inline">{t('shortcut')}</kbd>
      </Button>
      <div className="contents max-md:hidden">{bell}</div>
      <div className="flex max-w-full flex-wrap items-center gap-inline max-md:contents">
        <div key={`actions:${path}`} id={pageBarTargets.actions}
          className="flex max-w-full flex-wrap items-center gap-inline empty:hidden max-md:shrink-0 max-md:flex-nowrap max-md:[&>.control-primary]:w-auto!" />
        <div className="contents max-md:hidden">{install}</div>
      </div>
    </div>
    {openPath === path && <CaptainSearchPalette players={players} openerId={searchOpener} onClose={() => setOpenPath(null)} />}
  </>;
}

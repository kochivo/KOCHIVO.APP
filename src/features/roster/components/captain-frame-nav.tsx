'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource/use-resource';
import { loadCaptainFrameCounts } from './captain-frame-data';
import type { CaptainFrameData } from './captain-frame-data';
import { frameParent } from './captain-frame-model';
import type { FrameCounts } from './captain-frame-model';
import { CaptainFrameNavView } from './captain-frame-nav-view';
import { LoadingState } from '@/ui/loading-state';
import { Button } from '@/ui/button';
import { phoneMessages } from './captain-phone-messages';
import { pageBarTargets } from '@/ui/page-bar-slot';
import { useTaskCount } from '../hooks/use-task-count';
import { quickAddTargets } from './captain-quick-add-targets';
import type { QuickAddTarget } from './captain-quick-add-targets';

const CaptainMoreSheet = dynamic(() => import('./captain-more-sheet').then(module => module.CaptainMoreSheet), {
  loading: () => <LoadingState />,
});
const CaptainQuickAddSheet = dynamic(() => import('./captain-quick-add-sheet').then(module => module.CaptainQuickAddSheet), {
  loading: () => <LoadingState />,
});

export function CaptainFrameNav({ counts: initialCounts, captain, players, plan, bell, tools }: {
  counts: FrameCounts; captain?: CaptainFrameData['captain'];
  players?: CaptainFrameData['players'];
  plan?: { tier: string; used: number; limit: number } | null; bell?: ReactNode; tools?: ReactNode;
}) {
  const t = useT(phoneMessages);
  const load = useCallback(() => loadCaptainFrameCounts(), []);
  const resource = useResource('captain:frame-counts', load, { pollMs: 30_000 });
  const live = resource.error ? { inbox: null, join: null, billing: null } : resource.data ?? initialCounts;
  const path = usePathname();
  const tasks = useTaskCount(path, useLocale());
  const counts = { ...live, tasks };
  const active = frameParent(path);
  const [sheet, setSheet] = useState<{ path: string; kind: 'more' | 'quickAdd' } | null>(null);
  const [action, setAction] = useState<{ origin: string; target: QuickAddTarget; expires: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const arrived = useRef<typeof action>(null);
  const close = useCallback(() => setSheet(null), []);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 48rem)');
    const dismiss = () => { if (desktop.matches) { close(); setAction(null); setFailed(false); } };
    desktop.addEventListener('change', dismiss);
    return () => desktop.removeEventListener('change', dismiss);
  }, [close]);
  useEffect(() => {
    if (!action) return;
    const fail = () => { setFailed(true); setAction(null); };
    const timeout = window.setTimeout(fail, Math.max(0, action.expires - Date.now()));
    if (path !== action.target) {
      if (path !== action.origin || arrived.current === action) {
        window.clearTimeout(timeout);
        const abandoned = window.setTimeout(arrived.current === action ? () => setAction(null) : fail, 0);
        return () => window.clearTimeout(abandoned);
      }
      return () => window.clearTimeout(timeout);
    }
    arrived.current = action;
    let opened = false;

    // Page actions stream into the title bar, sometimes disabled while their data loads.
    const openAction = () => {
      const slot = document.getElementById(pageBarTargets.actions);
      const buttons = slot?.querySelectorAll<HTMLButtonElement>(quickAddTargets[action.target]);
      const button = buttons?.length === 1 ? buttons[0] : undefined;
      if (opened || Date.now() >= action.expires || !button || button.disabled) return;
      opened = true;
      window.clearTimeout(timeout);
      setAction(null);
      observer.disconnect();
      button.focus();
      button.click();
    };
    const observer = new MutationObserver(openAction);
    const bar = document.querySelector('[data-captain-top-bar]');
    if (bar) observer.observe(bar, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    openAction();
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [action, path]);
  const open = sheet?.path === path && sheet.kind === 'more';
  const adding = sheet?.path === path && sheet.kind === 'quickAdd';
  function chooseAgain() { setFailed(false); setAction(null); setSheet({ path, kind: 'quickAdd' }); }
  return <><CaptainFrameNavView active={active} counts={counts} open={open}
    onMore={() => { setFailed(false); setAction(null); setSheet({ path, kind: 'more' }); }} onClose={close}
    adding={adding} onQuickAdd={chooseAgain}
    more={open ? <CaptainMoreSheet active={active} counts={counts} captain={captain} plan={plan} bell={bell} tools={tools} onClose={close} />
      : adding ? <CaptainQuickAddSheet players={players ?? null} onClose={close}
        onAction={target => setAction({ origin: path, target, expires: Date.now() + 8_000 })} /> : null} />
    {(action || failed) && <div data-action-bar className="viewport-pinned glass-strong fixed inset-x-page-x bottom-[var(--nav-clearance)] z-40 flex items-center gap-inline rounded-control p-stack md:hidden">
      <p role={failed ? 'alert' : 'status'} className="flex-1 text-sm">{t(failed ? 'actionUnavailable' : 'openingAction')}</p>
      {failed && <Button variant="secondary" block={false} onClick={chooseAgain}>{t('chooseAction')}</Button>}
    </div>}
  </>;
}

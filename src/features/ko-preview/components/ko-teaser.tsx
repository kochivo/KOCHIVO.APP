'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { KoAvatar } from '@/ui/ko-avatar';
import type { KoRole } from '@/features/ko-core';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { KoTeaserPanel } from './ko-teaser-panel';
import { koEntryMessages as messages } from '@/features/ko-entry';
import { Button } from '@/ui/button';

export function KoTeaser({ role, userId, joined: initialJoined, readFailed = false }: {
  role: KoRole; userId: string; joined: boolean; readFailed?: boolean;
}) {
  const t = useT(messages);
  const openerId = useId();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(initialJoined);
  const [panel, setPanel] = useState<{ Component: typeof KoTeaserPanel | null; failed: boolean }>({ Component: null, failed: false });
  async function loadPanel() {
    setPanel({ Component: null, failed: false });
    try {
      const loaded = await import('./ko-teaser-panel');
      setPanel({ Component: loaded.KoTeaserPanel, failed: false });
    } catch { setPanel({ Component: null, failed: true }); }
  }
  if (/^\/player\/(?:workout|onboarding)(?:\/|$)/.test(path)) return null;
  return <>
    <button id={openerId} type="button" aria-label={t('teaserOpen')} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => { setOpen(!open); if (!open && !panel.Component) void loadPanel(); }}
      className="fixed start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+0.5rem)] z-30 grid size-13 min-h-12 min-w-12 place-items-center rounded-card border border-lime/30 bg-bg shadow-xl lg:bottom-6">
      <KoAvatar expression="welcome" motion={open ? 'none' : 'idle'} className="size-13" />
      <span className="absolute -top-2 -end-3 rounded-full border border-line bg-surface-raised px-inline py-inline text-xs font-bold text-muted">{t('soon')}</span>
    </button>
    {open && (panel.Component ? <panel.Component role={role} userId={userId} joined={joined} readFailed={readFailed}
      openerId={openerId} onClose={() => setOpen(false)} onJoined={() => setJoined(true)} />
      : <ResponsiveDialog modal aria-label={t('teaserOpen')} fallbackId={openerId} openerId={openerId} onDismiss={() => setOpen(false)}
        className="sheet fixed inset-auto start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+4.5rem)] z-50 m-0 w-96 max-w-[calc(100vw-2rem)] rounded-card border border-line p-card text-start text-ink lg:bottom-24">
        {captainWorkspaceEnabled() ? <IconButton type="button" aria-label={t('close')} onClick={() => setOpen(false)} className="ms-auto grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-5" /></IconButton> : <button type="button" aria-label={t('close')} onClick={() => setOpen(false)} className="ms-auto grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-5" /></button>}
        {panel.failed ? <>
          <p role="alert">{t('loadError')}</p>
          <Button type="button" onClick={() => void loadPanel()} variant={'primary'} block={false} className={"mt-stack min-h-12 px-page-x"}>{t('retry')}</Button>
        </> : <p role="status">{t('loading')}</p>}
      </ResponsiveDialog>)}
  </>;
}

'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { useInView } from '@/lib/use-in-view';
import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Hammer, X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { koFeedMessages, useKoFeedCount } from '@/features/ko-feed';
import { messages } from '../messages';
import type { KoExpression, KoRole } from '../policy';
import { KoAvatar } from '@/ui/ko-avatar';
import type { KoPanel } from './ko-panel';
import { Button } from '@/ui/button';

export function KoWidget({ role, interactive = false, account = false, userId, panelMessages }: {
  role: KoRole; interactive?: boolean; account?: boolean; userId?: string;
  panelMessages?: { loading: string; error: string; retry: string; fallback: string };
}) {
  const t = useT(messages);
  const captainPhone = role === 'captain' && captainWorkspaceEnabled();
  const position = role === 'captain' ? 'min-[760px]:start-auto min-[760px]:end-20' : '';
  const phonePosition = captainPhone ? 'max-md:start-auto! max-md:end-[max(var(--spacing-page-x),var(--safe-end))]! max-md:bottom-[var(--nav-clearance)]! max-md:size-12' : '';
  const motionRef = useInView<HTMLSpanElement>();
  interactive = account || interactive;
  const feedT = useT(koFeedMessages);
  // The launcher owns the count so the urgent badge shows before the panel is ever opened (T-123).
  const urgent = useKoFeedCount();
  const [panel, setPanel] = useState<{ Component: typeof KoPanel | null; failed: boolean }>({ Component: null, failed: false });
  async function loadPanel() {
    setPanel({ Component: null, failed: false });
    try {
      const loaded = await import('./ko-panel');
      setPanel({ Component: loaded.KoPanel, failed: false });
    } catch { setPanel({ Component: null, failed: true }); }
  }
  const openerId = useId();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    if (!panel.Component || window.matchMedia('(prefers-reduced-motion: reduce)').matches) setOpen(false);
    else setClosing(true);
  }, [panel.Component]);
  const [expression, setExpression] = useState<KoExpression>('welcome');
  useEffect(() => {
    if (!open) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => { if (closing && preference.matches) setOpen(false); };
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('[data-ko-panel], [data-ko-launcher]')) close();
    };
    document.addEventListener('pointerdown', dismiss);
    preference.addEventListener('change', reduce);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      preference.removeEventListener('change', reduce);
    };
  }, [open, closing, close]);
  return <>
    <button id={openerId} type="button" data-ko-launcher data-floating-fab aria-label={urgent ? feedT('badge', { n: urgent, count: urgent }) : t(account ? 'accountChatTitle' : 'open')} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => { if (open) close(); else { setClosing(false); setOpen(true); if (!panel.Component) void loadPanel(); } setExpression('welcome'); }}
      onMouseEnter={() => { if (!open) setExpression('cheer'); }} onMouseLeave={() => { if (!open) setExpression('welcome'); }}
      className={`group fixed start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+0.5rem)] z-30 grid size-13 min-h-12 min-w-12 place-items-center rounded-card border border-lime/30 bg-bg shadow-xl transition-transform hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:bottom-6 ${position}${phonePosition ? ` ${phonePosition}` : ''}`}>
      {!open && <span ref={motionRef} aria-hidden className="pointer-events-none absolute inset-0 rounded-card bg-lime/10 shadow-lime-glow animate-[ko-breathe_3.5s_ease-in-out_infinite] motion-reduce:animate-none" />}
      <KoAvatar expression={urgent > 0 ? 'thinking' : expression} motion={open ? 'none' : 'idle'} className={captainPhone ? 'size-13 max-md:size-12' : 'size-13'} />
      {urgent > 0 ? <span key={urgent} aria-hidden className="absolute -top-1 -end-1 grid size-6 place-items-center rounded-full bg-danger-soft text-xs font-bold text-danger animate-[ko-pop-in_200ms_ease-out_both] motion-reduce:animate-none">{urgent}</span>
        : !interactive && <span aria-hidden className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full border border-line bg-surface-raised text-muted"><Hammer className="size-3" /></span>}
      <span className={`pointer-events-none absolute bottom-full start-0 mb-inline whitespace-nowrap rounded-control border border-line bg-surface px-stack py-inline text-xs text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none${captainPhone ? ' max-md:start-auto max-md:end-0' : ''}`}>{t(account ? 'accountChatTitle' : interactive ? 'chatTitle' : 'soon')}</span>
    </button>
    {open && (panel.Component ? <panel.Component role={role} expression={expression} closing={closing}
      onClosed={() => { setOpen(false); setClosing(false); }} onExpression={setExpression} onClose={close}
      openerId={openerId} interactive={interactive} account={account} userId={userId} />
      : <ResponsiveDialog data-ko-panel aria-label={t('accountChatTitle')} fallbackId={openerId} openerId={openerId} onDismiss={close}
        className="sheet fixed inset-auto start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+4.5rem)] z-50 m-0 w-96 max-w-[calc(100vw-2rem)] rounded-card border border-line p-card text-start text-ink lg:bottom-24">
        {captainWorkspaceEnabled() ? <IconButton type="button" onClick={close} aria-label={t('close')} className="ms-auto grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-5" /></IconButton> : <button type="button" onClick={close} aria-label={t('close')} className="ms-auto grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-5" /></button>}
        {panel.failed ? <>
          <p role="alert">{panelMessages?.error ?? t('chatError')}</p>
          <Button type="button" onClick={() => void loadPanel()} variant={'primary'} block={false} className={"mt-stack min-h-12 px-page-x"}>{panelMessages?.retry ?? t('open')}</Button>
          <Link href="/ko" prefetch={false} className="ms-stack inline-flex min-h-12 items-center underline">{panelMessages?.fallback ?? t('accountChatTitle')}</Link>
        </> : <p role="status">{panelMessages?.loading ?? t('chatWorking')}</p>}
      </ResponsiveDialog>)}
  </>;
}

'use client';

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

export function KoWidget({ role, interactive = false, account = false, panelMessages }: {
  role: KoRole; interactive?: boolean; account?: boolean;
  panelMessages?: { loading: string; error: string; retry: string; fallback: string };
}) {
  const t = useT(messages);
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
    <button id={openerId} type="button" data-ko-launcher aria-label={urgent ? feedT('badge', { count: urgent }) : t(account ? 'accountChatTitle' : 'open')} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => { if (open) close(); else { setClosing(false); setOpen(true); if (!panel.Component) void loadPanel(); } setExpression('welcome'); }}
      onMouseEnter={() => { if (!open) setExpression('cheer'); }} onMouseLeave={() => { if (!open) setExpression('welcome'); }}
      className="group fixed start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+0.5rem)] z-30 grid size-13 min-h-12 min-w-12 place-items-center rounded-card border border-lime/30 bg-bg shadow-xl transition-transform hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:bottom-6">
      {!open && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card bg-lime/10 shadow-lime-glow animate-[ko-breathe_3.5s_ease-in-out_infinite] motion-reduce:animate-none" />}
      <KoAvatar expression={urgent > 0 ? 'thinking' : expression} motion={open ? 'none' : 'idle'} className="size-13" />
      {urgent > 0 ? <span key={urgent} aria-hidden className="absolute -top-1 -end-1 grid size-6 place-items-center rounded-full bg-danger-soft text-xs font-bold text-danger animate-[ko-pop-in_200ms_ease-out_both] motion-reduce:animate-none">{urgent}</span>
        : !interactive && <span aria-hidden className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full border border-line bg-surface-raised text-muted"><Hammer className="size-3" /></span>}
      <span className="pointer-events-none absolute bottom-full start-0 mb-2 whitespace-nowrap rounded-control border border-line bg-surface px-3 py-2 text-xs text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">{t(account ? 'accountChatTitle' : interactive ? 'chatTitle' : 'soon')}</span>
    </button>
    {open && (panel.Component ? <panel.Component role={role} expression={expression} closing={closing}
      onClosed={() => { setOpen(false); setClosing(false); }} onExpression={setExpression} onClose={close}
      openerId={openerId} interactive={interactive} account={account} />
      : <ResponsiveDialog data-ko-panel aria-label={t('accountChatTitle')} fallbackId={openerId} openerId={openerId} onDismiss={close}
        className="sheet fixed inset-auto start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+4.5rem)] z-50 m-0 w-96 max-w-[calc(100vw-2rem)] rounded-card border border-line p-4 text-start text-ink lg:bottom-24">
        <button type="button" onClick={close} aria-label={t('close')} className="ms-auto grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-5" /></button>
        {panel.failed ? <>
          <p role="alert">{panelMessages?.error ?? t('chatError')}</p>
          <button type="button" onClick={() => void loadPanel()} className="mt-3 min-h-12 rounded-control bg-lime px-4 text-on-lime">{panelMessages?.retry ?? t('open')}</button>
          <Link href="/ko" prefetch={false} className="ms-3 inline-flex min-h-12 items-center underline">{panelMessages?.fallback ?? t('accountChatTitle')}</Link>
        </> : <p role="status">{panelMessages?.loading ?? t('chatWorking')}</p>}
      </ResponsiveDialog>)}
  </>;
}

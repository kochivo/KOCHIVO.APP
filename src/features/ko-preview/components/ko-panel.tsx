'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';
import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { ClipboardList, Dumbbell, LockKeyhole, X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { KoFeed } from './ko-feed';
import { messages } from '../messages';
import { contextFromPath } from '../context';
import { koExpressions, nextKoExpression } from '../policy';
import type { KoExpression, KoRole } from '../policy';
import { KoAvatar } from '@/ui/ko-avatar';
import { KoChat } from './ko-chat';
import { useSheetDrag } from '../hooks/use-sheet-drag';
import { cn } from '@/lib/cn';

const floatingLimit = 'min(36rem, calc(var(--visible-viewport-height, 100dvh) - var(--safe-top) - var(--nav-clearance) - 6rem))';

export function KoPanel({ role, expression, onExpression, onClose, openerId, interactive = false, account = false, userId, closing = false, onClosed }: {
  role: KoRole; expression: KoExpression; onExpression: (value: KoExpression) => void; onClose: () => void; openerId: string; interactive?: boolean;
  account?: boolean; userId?: string; closing?: boolean; onClosed?: () => void;
}) {
  const t = useT(messages);
  interactive = account || interactive;
  const titleId = useId();
  const pathname = usePathname();
  const [dropped, setDropped] = useState(false);
  const [header, setHeader] = useState<HTMLElement | null>(null);
  const { offset, handlers } = useSheetDrag(interactive && !closing, onClose);
  const context = dropped ? null : contextFromPath(pathname ?? '/');
  const Icon = role === 'captain' ? ClipboardList : Dumbbell;
  const closeClass = `ms-auto grid min-h-12 min-w-12 place-items-center rounded-control hover:bg-ink/5 hover:text-ink ${interactive ? 'max-lg:order-last' : ''}`;
  const feed = <KoFeed avatar={value => <KoAvatar expression={value} className="size-10" />} />;
  // MobileViewport also pins modal dialogs above the keyboard through the global dialog rule.
  const style = interactive ? {
    padding: 0,
    '--ko-floating-limit': floatingLimit,
    '--ko-sheet-height': 'calc(var(--visible-viewport-height, 100dvh) - var(--safe-top) - 0.75rem)',
    '--ko-drag-offset': `${offset}px`,
  } as CSSProperties : { padding: 0, maxBlockSize: floatingLimit };
  return <ResponsiveDialog data-ko-panel data-closing={closing} aria-labelledby={titleId} fallbackId={openerId} openerId={openerId} onDismiss={onClose}
    onAnimationEnd={event => { if (closing && event.target === event.currentTarget) onClosed?.(); }}
    style={style}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.x || event.clientX > box.right || event.clientY < box.y || event.clientY > box.bottom) onClose();
    }}
    className={cn('sheet fixed inset-auto z-50 m-0 border border-line text-start text-ink shadow-2xl backdrop:bg-bg-deep/50 motion-reduce:animate-none', interactive
      ? 'open:grid grid-rows-1 overflow-hidden max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-(--ko-sheet-height) max-lg:max-h-none! max-lg:w-full max-lg:max-w-none max-lg:rounded-t-card motion-safe:max-lg:translate-y-(--ko-drag-offset) lg:start-[max(1rem,var(--safe-start))] lg:bottom-24 lg:max-h-(--ko-floating-limit) lg:w-96 lg:max-w-[calc(100vw-2rem)] lg:rounded-card'
      : 'start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+4.5rem)] max-h-[calc(100dvh-var(--safe-top)-var(--nav-clearance)-6rem)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-card lg:bottom-24 lg:max-h-[calc(100dvh-var(--safe-top)-7rem)]')}>
    <div className={`glass-strong ${interactive ? 'flex min-h-0 flex-col overflow-hidden' : ''}`}>
    <header ref={userId ? setHeader : undefined} {...(interactive ? handlers : {})} className={`glass-strong sticky top-0 z-10 flex items-center gap-stack border-b border-line p-card before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-line before:via-lime/50 before:to-line ${interactive ? 'shrink-0 max-lg:touch-none max-lg:pt-section' : ''}`}>
      {interactive && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-inline mx-auto h-1 w-10 rounded-full bg-line lg:hidden" />}
      <span className="relative size-10 shrink-0"><KoAvatar expression={expression} className="size-10" /><span aria-hidden className="absolute bottom-0 end-0 size-2 rounded-full bg-lime ring-2 ring-surface" /></span>
      <div className={interactive ? 'max-lg:flex-1' : undefined}><span id={interactive ? titleId : undefined} className="font-display text-xl font-extrabold">{t('name')}</span>
        <p className="text-xs text-muted">{t('subtitle')}</p></div>
      {captainWorkspaceEnabled() ? <IconButton type="button" onClick={onClose} aria-label={t('close')} className={`${closeClass} text-ink`}><X aria-hidden className="size-5" /></IconButton> : <button type="button" onClick={onClose} aria-label={t('close')} className={`${closeClass} text-muted`}><X aria-hidden className="size-5" /></button>}
    </header>
    {!account && context && <div className="flex items-center gap-inline border-b border-line px-page-x text-sm text-muted">
      <span>{t(`context.${context.screen}`)}</span>
      {captainWorkspaceEnabled() ? <IconButton type="button" aria-label={t('context.remove')} onClick={() => setDropped(true)} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-4" /></IconButton> : <button type="button" aria-label={t('context.remove')} onClick={() => setDropped(true)} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-4" /></button>}
    </div>}
    {!interactive && feed}
    {interactive ? <KoChat role={role} context={context} onExpression={onExpression} account={account} userId={userId} header={header} sheet feed={feed} /> : <div className="space-y-card-gap p-card">
      <div className="text-center">
        {captainWorkspaceEnabled() ? <Button variant="secondary" aria-label={t('changeExpression')} onClick={() => onExpression(nextKoExpression(expression))} className="mx-auto min-h-12 flex-col gap-inline rounded-card border border-line p-stack hover:scale-105 motion-reduce:hover:scale-100">
          <KoAvatar expression={expression} className="size-32" />
          <span className="text-sm">{t('changeExpression')}</span>
        </Button> : <button type="button" aria-label={t('changeExpression')} onClick={() => onExpression(nextKoExpression(expression))} className="mx-auto block rounded-card hover:scale-105 motion-reduce:hover:scale-100">
          <KoAvatar expression={expression} className="size-32" />
        </button>}
        <h2 id={titleId} className="mt-stack text-xl font-extrabold">{t('title')}</h2>
        <p className="mt-inline text-sm text-muted">{t('intro')}</p>
      </div>
      <div className="flex items-start gap-stack rounded-control border border-line bg-bg p-card">
        <Icon aria-hidden className="mt-inline size-5 shrink-0 text-lime-ink" />
        <div><h3 className="text-sm font-bold">{t(role === 'captain' ? 'captainFeature' : 'playerFeature')}</h3><p className="mt-inline text-xs leading-6 text-muted">{t(role)}</p></div>
      </div>
      <div role="group" aria-label={t('expressions')} className="flex gap-inline">
        {koExpressions.map(value => <button key={value} type="button" aria-pressed={expression === value} onClick={() => onExpression(value)}
          className={`min-h-12 min-w-0 flex-1 rounded-control border px-inline text-xs ${expression === value ? 'border-lime/40 bg-lime-soft font-bold text-lime-ink' : 'border-line text-muted hover:text-ink'}`}>{t(`expression.${value}`)}</button>)}
      </div>
      <p className="text-center text-xs text-muted">{t('status')}. {t('planned')}</p>
      <div aria-disabled="true" className="flex min-h-12 items-center justify-between gap-stack rounded-control border border-line bg-surface-raised px-stack text-sm text-muted"><span>{t('composer')}</span><LockKeyhole aria-hidden className="size-4 shrink-0" /></div>
      <p className="text-center text-xs font-bold text-lime-ink">{t('soon')}</p>
    </div>}
    </div>
  </ResponsiveDialog>;
}

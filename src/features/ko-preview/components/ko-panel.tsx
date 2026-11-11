'use client';

import { useId, useState } from 'react';
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

export function KoPanel({ role, expression, onExpression, onClose, openerId, interactive = false, account = false, closing = false, onClosed }: {
  role: KoRole; expression: KoExpression; onExpression: (value: KoExpression) => void; onClose: () => void; openerId: string; interactive?: boolean;
  account?: boolean; closing?: boolean; onClosed?: () => void;
}) {
  const t = useT(messages);
  interactive = account || interactive;
  const titleId = useId();
  const pathname = usePathname();
  const [dropped, setDropped] = useState(false);
  const context = dropped ? null : contextFromPath(pathname ?? '/');
  const Icon = role === 'captain' ? ClipboardList : Dumbbell;
  return <ResponsiveDialog data-ko-panel data-closing={closing} aria-labelledby={titleId} fallbackId={openerId} openerId={openerId} onDismiss={onClose}
    onAnimationEnd={event => { if (closing && event.target === event.currentTarget) onClosed?.(); }}
    style={{ padding: 0, maxBlockSize: 'min(36rem, calc(var(--visible-viewport-height, 100dvh) - var(--safe-top) - var(--nav-clearance) - 6rem))' }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.x || event.clientX > box.right || event.clientY < box.y || event.clientY > box.bottom) onClose();
    }}
    className="sheet fixed inset-auto start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+4.5rem)] z-50 m-0 max-h-[calc(100dvh-var(--safe-top)-var(--nav-clearance)-6rem)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-card border border-line text-start text-ink shadow-2xl backdrop:bg-bg-deep/50 lg:bottom-24 lg:max-h-[calc(100dvh-var(--safe-top)-7rem)] motion-reduce:animate-none">
    <div className="glass-strong">
    <header className="glass-strong sticky top-0 z-10 flex items-center gap-3 border-b border-line p-4 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-line before:via-lime/50 before:to-line">
      <span className="relative size-10 shrink-0"><KoAvatar expression={expression} className="size-10" /><span aria-hidden className="absolute bottom-0 end-0 size-2 rounded-full bg-lime ring-2 ring-surface" /></span>
      <div><span id={interactive ? titleId : undefined} className="font-display text-xl font-extrabold">{t('name')}</span>
        <p className="text-xs text-muted">{t('subtitle')}</p></div>
      <button type="button" onClick={onClose} aria-label={t('close')} className="ms-auto grid min-h-12 min-w-12 place-items-center rounded-control text-muted hover:bg-ink/5 hover:text-ink"><X aria-hidden className="size-5" /></button>
    </header>
    {!account && context && <div className="flex items-center gap-2 border-b border-line px-4 text-sm text-muted">
      <span>{t(`context.${context.screen}`)}</span>
      <button type="button" aria-label={t('context.remove')} onClick={() => setDropped(true)} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-4" /></button>
    </div>}
    <KoFeed avatar={value => <KoAvatar expression={value} className="size-10" />} />
    {interactive ? <KoChat role={role} context={context} onExpression={onExpression} account={account} /> : <div className="space-y-5 p-5">
      <div className="text-center">
        <button type="button" aria-label={t('changeExpression')} onClick={() => onExpression(nextKoExpression(expression))} className="mx-auto block rounded-card hover:scale-105 motion-reduce:hover:scale-100">
          <KoAvatar expression={expression} className="size-32" />
        </button>
        <h2 id={titleId} className="mt-3 text-xl font-extrabold">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted">{t('intro')}</p>
      </div>
      <div className="flex items-start gap-3 rounded-control border border-line bg-bg p-4">
        <Icon aria-hidden className="mt-1 size-5 shrink-0 text-lime-ink" />
        <div><h3 className="text-sm font-bold">{t(role === 'captain' ? 'captainFeature' : 'playerFeature')}</h3><p className="mt-2 text-xs leading-6 text-muted">{t(role)}</p></div>
      </div>
      <div role="group" aria-label={t('expressions')} className="flex gap-2">
        {koExpressions.map(value => <button key={value} type="button" aria-pressed={expression === value} onClick={() => onExpression(value)}
          className={`min-h-12 min-w-0 flex-1 rounded-control border px-2 text-xs ${expression === value ? 'border-lime/40 bg-lime-soft font-bold text-lime-ink' : 'border-line text-muted hover:text-ink'}`}>{t(`expression.${value}`)}</button>)}
      </div>
      <p className="text-center text-xs text-muted">{t('status')}. {t('planned')}</p>
      <div aria-disabled="true" className="flex min-h-12 items-center justify-between gap-3 rounded-control border border-line bg-surface-raised px-3 text-sm text-muted"><span>{t('composer')}</span><LockKeyhole aria-hidden className="size-4 shrink-0" /></div>
      <p className="text-center text-xs font-bold text-lime-ink">{t('soon')}</p>
    </div>}
    </div>
  </ResponsiveDialog>;
}

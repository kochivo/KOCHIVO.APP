'use client';
import { clickableClass, Button, buttonClass } from '@/ui/button';
import { RowChevron } from '@/ui/row-chevron';
import { KoSend } from '@/ui/icons/ko-send';
import { KoTemplate } from '@/ui/icons/ko-template';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import Link from 'next/link';
import { Check, CloudCheck, CloudUpload, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useT } from '@/core/i18n/client';

import { UnderlineTabs } from '@/ui/underline-tabs';
import { messages } from './editor/messages';
import { messages as trainingMessages } from './messages';

export function EditorHeader({ playerId, playerName, remainingDays, template, title, status, busy, disabled, onSend, onAssign, onRetry, children, starting }: {
  starting?: boolean;
  children?: ReactNode;
  playerId?: string; playerName?: string; remainingDays?: number; template: boolean; title?: string;
  status: 'saved' | 'saving' | 'error'; busy: boolean; disabled: boolean; onSend: () => void; onAssign: () => void; onRetry: () => void;
}) {
  const SendIcon = captainWorkspaceEnabled() ? KoSend : Send;
  const t = useT(messages), tt = useT(trainingMessages), base = `/captain/players/${playerId}`;
  // Autosave already runs; the button reassures captains and confirms the save they asked for.
  const [asked, setAsked] = useState(false);
  const confirmed = asked && status === 'saved' && !busy;
  useEffect(() => { if (!confirmed) return; const timer = setTimeout(() => setAsked(false), 2500); return () => clearTimeout(timer); }, [confirmed]);
  return <>
    <header className="flex flex-wrap items-center gap-stack">
      <span aria-hidden className="glass-strong grid size-[52px] shrink-0 place-items-center rounded-full text-lg">{template ? <KoTemplate className="size-6" /> : (playerName || title || '').charAt(0)}</span>
      <div className="relative me-auto min-w-0 pt-card"><Link href={template ? '/captain/templates' : '/captain/players'} className={`${clickableClass} absolute -top-4 start-0 flex min-h-12 items-center gap-inline whitespace-nowrap text-xs text-muted`}>{template ? title : t('breadcrumb', { name: playerName ?? '' })}<RowChevron className="size-3.5" /></Link>
        <h1 className="break-words font-display text-stat font-semibold leading-tight">{template ? title : t('title', { name: playerName?.trim().split(/\s+/)[0] ?? '' })}</h1></div>
      {!template && remainingDays !== undefined && <span className="rounded-full bg-lime-soft px-stack py-inline text-xs text-lime">{t('active', { n: Math.max(0, remainingDays) })}</span>}
      <span role="status" aria-live="polite" className="inline-flex min-h-12 items-center gap-inline text-xs text-faint">{status === 'saved' ? <CloudCheck aria-hidden className="size-4 text-lime" /> : <CloudUpload aria-hidden className="size-4" />}
        {status === 'error' ? <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-danger"} onClick={onRetry}>{tt('retry')}</Button> : t(status === 'saved' ? 'saved' : 'saving')}</span>
      {children}
      {!template && playerId && <Link prefetch={false} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x text-sm" })} href={`${base}/preview`}>{t('preview')}</Link>}
      {template && <Button variant="secondary" disabled={disabled || busy} className="min-h-12 w-auto! rounded-full!" aria-live="polite"
        onClick={() => { setAsked(true); onRetry(); }}>{confirmed && <Check aria-hidden className="size-4 text-lime" />}{t(confirmed ? 'templateSaved' : 'saveTemplate')}</Button>}
      <Button variant={starting ? 'secondary' : 'primary'} id={template ? 'assign-program' : undefined} disabled={disabled || busy} className="min-h-12 w-auto! rounded-full!" onClick={template ? onAssign : onSend}>{!template && <SendIcon aria-hidden className="size-4" />}{template ? t('assign') : tt('send')}</Button>
    </header>
    {!template && playerId && <UnderlineTabs label={t('tabs')} items={([
      ['overview', base], ['training', `${base}/programs`], ['nutrition', `${base}/nutrition`], ['assessments', `${base}/assessments`], ['checkins', `${base}/checkins`],
    ] as const).map(([key, href]) => ({ href, label: t(key), active: key === 'training' }))} />}
  </>;
}

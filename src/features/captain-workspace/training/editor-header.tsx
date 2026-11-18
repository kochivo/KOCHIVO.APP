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
import { messages as phoneMessages } from './phone/messages';

export function EditorHeader({ playerId, playerName, remainingDays, template, title, status, busy, disabled, onSend, onAssign, onRetry, children, starting, phoneDay }: {
  starting?: boolean;
  phoneDay?: string;
  children?: ReactNode;
  playerId?: string; playerName?: string; remainingDays?: number; template: boolean; title?: string;
  status: 'saved' | 'saving' | 'error'; busy: boolean; disabled: boolean; onSend: () => void; onAssign: () => void; onRetry: () => void;
}) {
  const SendIcon = captainWorkspaceEnabled() ? KoSend : Send;
  const t = useT(messages), tt = useT(trainingMessages), base = `/captain/players/${playerId}`;
  const phone = useT(phoneMessages);
  // Autosave already runs; the button reassures captains and confirms the save they asked for.
  const [asked, setAsked] = useState(false);
  const confirmed = asked && status === 'saved' && !busy;
  useEffect(() => { if (!confirmed) return; const timer = setTimeout(() => setAsked(false), 2500); return () => clearTimeout(timer); }, [confirmed]);
  return <>
    <header className="flex flex-wrap items-center gap-stack">
      <span aria-hidden className={`glass-strong grid size-[52px] shrink-0 place-items-center rounded-full text-lg${phoneDay ? ' max-md:hidden' : ''}`}>{template ? <KoTemplate className="size-6" /> : (playerName || title || '').charAt(0)}</span>
      {phoneDay && <div className="flex min-w-0 flex-1 items-center gap-stack md:hidden">
        <Link href={template ? '/captain/templates' : '/captain/players'} aria-label={phone('back')}
          className={buttonClass({ variant: 'secondary', block: false, className: 'min-w-12 shrink-0 px-stack' })}><RowChevron className="size-5 rotate-180" /></Link>
        <div className="min-w-0"><h1 className="break-words text-md font-bold">{title}</h1><p className="text-xs text-muted">{phoneDay}</p></div>
      </div>}
      <div className={`relative me-auto min-w-0 pt-card${phoneDay ? ' max-md:hidden' : ''}`}><Link href={template ? '/captain/templates' : '/captain/players'} className={`${clickableClass} absolute -top-4 start-0 flex min-h-12 items-center gap-inline whitespace-nowrap text-xs text-muted`}>{template ? title : t('breadcrumb', { name: playerName ?? '' })}<RowChevron className="size-3.5" /></Link>
        <h1 className="break-words font-display text-stat font-semibold leading-tight">{template ? title : t('title', { name: playerName?.trim().split(/\s+/)[0] ?? '' })}</h1></div>
      {!template && remainingDays !== undefined && <span className="rounded-full bg-lime-soft px-stack py-inline text-xs text-lime">{t('active', { n: Math.max(0, remainingDays) })}</span>}
      <span role="status" aria-live="polite" className={`inline-flex min-h-12 items-center gap-inline text-xs text-faint${phoneDay && status !== 'error' ? ' max-md:min-h-0' : ''}`}>{status === 'saved' ? <CloudCheck aria-hidden className="size-4 text-lime" /> : <CloudUpload aria-hidden className="size-4" />}
        {status === 'error' ? <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-danger"} onClick={onRetry}>{tt('retry')}</Button> : t(status === 'saved' ? 'saved' : 'saving')}</span>
      {children}
      {!template && playerId && <Link prefetch={false} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x text-sm" })} href={`${base}/preview`}>{t('preview')}</Link>}
      {template && <Button variant={starting ? 'secondary' : 'primary'} className={phoneDay ? 'max-md:bg-surface! max-md:bg-none! max-md:text-ink! max-md:shadow-none!' : undefined} block={false} disabled={disabled || busy} aria-live="polite"
        onClick={() => { setAsked(true); onRetry(); }}>{confirmed && <Check aria-hidden className="size-4 text-lime" />}{t(confirmed ? 'templateSaved' : 'saveTemplate')}</Button>}
      <Button variant={template || starting ? 'secondary' : 'primary'} block={false} id={template ? 'assign-program' : undefined} disabled={disabled || busy} onClick={template ? onAssign : onSend}
        className={phoneDay ? 'max-md:fixed max-md:start-[max(var(--spacing-page-x),var(--safe-start))] max-md:end-[max(var(--spacing-page-x),var(--safe-end))] max-md:bottom-[var(--nav-clearance)] max-md:z-20 max-md:bg-linear-to-b! max-md:from-lime-top max-md:to-lime-bottom max-md:font-extrabold max-md:text-on-lime! max-md:shadow-(--shadow-control-primary)!' : undefined}>
        {!template && <SendIcon aria-hidden className="size-4" />}
        {phoneDay ? <><span className="max-md:hidden">{template ? t('assign') : tt('send')}</span><span className="md:hidden">{template ? phone('chooseAndSend') : phone('saveAndSend', { n: 1 })}</span></> : template ? t('assign') : tt('send')}
      </Button>
    </header>
    {!template && playerId && <UnderlineTabs label={t('tabs')} items={([
      ['overview', base], ['training', `${base}/programs`], ['nutrition', `${base}/nutrition`], ['assessments', `${base}/assessments`], ['checkins', `${base}/checkins`],
    ] as const).map(([key, href]) => ({ href, label: t(key), active: key === 'training' }))} />}
  </>;
}

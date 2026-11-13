'use client';
import { KoSend } from '@/ui/icons/ko-send';
import { KoTemplate } from '@/ui/icons/ko-template';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import Link from 'next/link';
import { CloudCheck, CloudUpload, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
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
  return <>
    <header className="flex flex-wrap items-center gap-3">
      <span aria-hidden className="glass-strong grid size-[52px] shrink-0 place-items-center rounded-full text-lg">{template ? <KoTemplate className="size-6" /> : (playerName || title || '').charAt(0)}</span>
      <div className="relative me-auto min-w-0 pt-5"><Link href={template ? '/captain/templates' : '/captain/players'} className="absolute -top-4 start-0 flex min-h-12 items-center whitespace-nowrap text-xs text-faint">{template ? title : t('breadcrumb', { name: playerName ?? '' })}</Link>
        <h1 className="break-words font-display text-[30px] font-semibold leading-tight">{template ? title : t('title', { name: playerName?.trim().split(/\s+/)[0] ?? '' })}</h1></div>
      {!template && remainingDays !== undefined && <span className="rounded-full bg-lime-soft px-3 py-1 text-xs text-lime">{t('active', { n: Math.max(0, remainingDays) })}</span>}
      <span role="status" aria-live="polite" className="inline-flex min-h-12 items-center gap-2 text-xs text-faint">{status === 'saved' ? <CloudCheck aria-hidden className="size-4 text-lime" /> : <CloudUpload aria-hidden className="size-4" />}
        {status === 'error' ? <button className="min-h-12 rounded-full border border-line px-3 text-danger" onClick={onRetry}>{tt('retry')}</button> : t(status === 'saved' ? 'saved' : 'saving')}</span>
      {children}
      {!template && playerId && <Link prefetch={false} className="glass inline-flex min-h-12 items-center rounded-full border border-line-soft px-4 text-sm" href={`${base}/preview`}>{t('preview')}</Link>}
      <Button variant={starting ? 'secondary' : 'primary'} id={template ? 'assign-program' : undefined} disabled={disabled || busy} className="min-h-12 w-auto! rounded-full!" onClick={template ? onAssign : onSend}>{!template && <SendIcon aria-hidden className="size-4" />}{template ? t('assign') : tt('send')}</Button>
    </header>
    {!template && playerId && <UnderlineTabs label={t('tabs')} items={([
      ['overview', base], ['training', `${base}/programs`], ['nutrition', `${base}/nutrition`], ['assessments', `${base}/assessments`], ['checkins', `${base}/checkins`],
    ] as const).map(([key, href]) => ({ href, label: t(key), active: key === 'training' }))} />}
  </>;
}

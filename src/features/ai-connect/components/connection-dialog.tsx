'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button, buttonClass } from '@/ui/button';
import { cn } from '@/lib/cn';
import { messages } from '../messages';
import type { ConnectApp } from './grant-list';

export type ConnectionStep = { opener: HTMLButtonElement } & (
  { kind: 'connect'; name: ConnectApp } | { kind: 'disconnect'; id: string; name: string }
);

export function ConnectionDialog({ step, url, pending, failed, fallback, onClose, onConfirm }: {
  step: ConnectionStep; url: string; pending: boolean; failed: boolean;
  fallback: () => void; onClose: () => void; onConfirm: (id: string) => void;
}) {
  const t = useT(messages);
  const titleId = useId(), detailId = useId();
  const dialog = useRef<HTMLDialogElement>(null), title = useRef<HTMLHeadingElement>(null);
  const [copyResult, setCopyResult] = useState<'copied' | 'copyError'>();
  const connect = step.kind === 'connect';

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    title.current?.focus();
    return () => {
      element?.close();
      if (step.opener.isConnected) step.opener.focus();
      else fallback();
    };
  }, [step, fallback]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyResult('copied');
    } catch {
      setCopyResult('copyError');
    }
  }

  return <dialog ref={dialog} role={connect ? undefined : 'alertdialog'} aria-modal="true"
    aria-labelledby={titleId} aria-describedby={connect ? undefined : detailId} aria-busy={pending}
    onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}
    className={cn('sheet fixed max-h-[90dvh] max-w-lg space-y-card-gap overflow-y-auto p-card text-ink backdrop:bg-bg-deep/80', connect
      ? 'inset-x-0 top-auto bottom-0 m-0 w-full rounded-t-card md:mx-auto'
      : 'inset-0 m-auto w-[calc(100%-32px)] rounded-card border border-line bg-surface')}>
    <h2 id={titleId} ref={title} tabIndex={-1} className="text-title font-semibold">
      {t(connect ? 'connectTool' : 'disconnectTitle', { name: step.name })}
    </h2>
    {connect ? <>
      <ol className="list-decimal space-y-stack ps-card">
        <li className="space-y-stack">
          <p className="text-sm font-semibold">{t('copyStep')}</p>
          <div className="flex items-center gap-inline">
            <code dir="ltr" className="min-w-0 flex-1 wrap-anywhere rounded-control bg-surface-raised p-stack text-start text-xs">{url}</code>
            <Button variant="secondary" block={false} onClick={() => void copy()}>{t('copy')}</Button>
          </div>
          {copyResult && <p role={copyResult === 'copyError' ? 'alert' : 'status'}
            className={copyResult === 'copyError' ? 'text-sm text-danger' : 'text-sm text-muted'}>{t(copyResult)}</p>}
        </li>
        <li className="space-y-stack text-sm">
          <p className="font-semibold">{t(step.name === 'Claude' ? 'claudeStep' : 'chatgptStep')}</p>
          <p className="text-muted">{t('pasteStep')}</p>
        </li>
        <li className="text-sm font-semibold">{t('allowStep')}</li>
      </ol>
      <div className="flex flex-wrap gap-inline">
        <a href={step.name === 'Claude' ? 'https://claude.ai/' : 'https://chatgpt.com/'}
          target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary' })}>{t('openTool', { name: step.name })}</a>
        <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
      </div>
    </> : <>
      <p id={detailId} className="wrap-anywhere text-sm text-muted">{t('disconnectPrompt', { name: step.name })}</p>
      {failed && <p role="alert" className="text-sm text-danger">{t('disconnectError')}</p>}
      <div className="flex flex-wrap gap-inline">
        <Button variant="secondary" disabled={pending} onClick={onClose}>{t('keepConnected')}</Button>
        <Button variant="secondary" disabled={pending} onClick={() => onConfirm(step.id)}>
          {t(pending ? 'pending' : 'disconnect')}
        </Button>
      </div>
    </>}
  </dialog>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';
import type { ActionState, ChatAction } from '../hooks/use-ko-actions';
import { messages } from '../messages';

export function KoActionCard({ action, number, state, busy, focus, onConfirm, onCancel, now = Date.now }: {
  action: ChatAction; number: number; state?: ActionState; busy: boolean; focus: boolean;
  onConfirm: () => void; onCancel: () => void; now?: () => number;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const confirm = useRef<HTMLButtonElement>(null);
  const focused = useRef(false);
  const { approval } = action;
  const [expired, setExpired] = useState(() => approval.expired(now()));
  const pending = !state;
  useEffect(() => {
    if (!pending || expired) return;
    const timer = setTimeout(() => setExpired(true), Math.max(0, approval.expiresAt - now()));
    return () => clearTimeout(timer);
  }, [approval, expired, now, pending]);
  useEffect(() => {
    if (focus && !busy && pending && !expired && !focused.current && confirm.current) {
      confirm.current.focus();
      focused.current = true;
    }
  }, [focus, busy, pending, expired]);
  const terminal = state?.kind === 'done' || state?.kind === 'failed';
  const status = terminal ? state.text : state?.kind === 'cancelled' ? t('confirmCancelled')
    : pending && expired ? t('confirmExpired') : '';
  const controls = (pending && !expired) || state?.kind === 'submitting';
  const disabled = busy || state?.kind === 'submitting';
  const workspace = captainWorkspaceEnabled();
  return <div role="group" aria-label={action.title} dir={locale === 'ar' ? 'rtl' : 'ltr'}
    className="space-y-inline rounded-control border border-line p-stack">
    <p className="text-sm font-bold">{state?.kind === 'done' && <span className="text-lime-ink" aria-hidden>✓ </span>}
      <bdi dir="ltr">{number}.</bdi> {action.title}</p>
    {status && <p className="text-xs text-muted" role="status">{status}</p>}
    {controls && <>
      {action.detail && <p className="whitespace-pre-wrap text-xs text-muted">{action.detail}</p>}
      <div className="flex flex-wrap gap-inline">
        <Button ref={confirm} type="button" disabled={disabled} variant={workspace ? 'secondary' : 'primary'} block={false}
          className={workspace ? 'min-h-12 px-page-x text-ink disabled:opacity-50' : 'min-h-12 px-page-x disabled:opacity-50'}
          onClick={onConfirm}>{t('confirmAction')}</Button>
        {workspace ? <Button variant="secondary" type="button" disabled={disabled} className="min-h-12 rounded-control px-page-x text-muted disabled:opacity-50"
          onClick={onCancel}>{t('confirmCancel')}</Button> : <button type="button" disabled={disabled} className="min-h-12 rounded-control px-page-x text-muted disabled:opacity-50"
          onClick={onCancel}>{t('confirmCancel')}</button>}
      </div>
    </>}
  </div>;
}

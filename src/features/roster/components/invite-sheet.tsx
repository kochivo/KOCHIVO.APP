'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useEffect, useRef, useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { Button, Segmented } from '@/ui';
import { createInvite } from '../data/create-invite';
import { whatsappUrl } from '@/lib/whatsapp';
import { inviteMessage, inviteUrl } from '../invite';
import { useDemoExpiry } from '@/features/demo';

export function InviteSheet({ captainFirstName, onClose }: { captainFirstName: string; onClose: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const demo = useDemoExpiry();
  const dialog = useRef<HTMLDialogElement>(null);
  const [days, setDays] = useState('30');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function create() {
    if (demo) { setError(t('invitesAreDisabledInTheDemo')); return; }
    setError('');
    startTransition(async () => {
      try {
        const result = await createInvite(Number(days));
        if ('error' in result) setError(result.error);
        else setUrl(inviteUrl(result.code));
      } catch { setError(t('couldntCreateTheInviteTryAgain')); }
    });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage(t('linkCopied'));
    } catch { setCopyMessage(t('copyIsntAvailableSelectAndCopyThe')); }
  }
  return (
    <dialog ref={dialog} aria-labelledby="invite-heading" onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-6 text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="invite-heading" className="text-2xl font-extrabold">{t('inviteANewPlayer')}</h2>
        <Button variant="ghost" aria-label={t('closeInvite')} onClick={onClose} className="min-h-12 min-w-12 px-0"><X aria-hidden className="size-5" /></Button>
      </div>
      {demo ? <p className="text-muted">{t('invitesAreDisabledInTheDemo')}</p> : !url ? <div className="space-y-5">
        <p className="text-sm text-muted">{t('theSubscriptionStartsTodayChooseItsLength')}</p>
        <Segmented aria-label={t('subscriptionLength')} options={[{ value: '7', label: t('subscriptionDays', { n: 7, count: formatNumber(7, locale) }) }, { value: '30', label: t('subscriptionDays', { n: 30, count: formatNumber(30, locale) }) }, { value: '90', label: t('subscriptionDays', { n: 90, count: formatNumber(90, locale) }) }]} value={days} onChange={(value) => { if (!pending) setDays(value); }} />
        <Button onClick={create} disabled={pending} className="w-full min-h-12">{pending ? t('preparingInvite') : t('createInviteLink')}</Button>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div> : <div className="space-y-4">
        <p className="text-sm text-muted">{t('theLinkIsReadySendItWithin')}</p>
        <label className="block space-y-2 text-sm">{t('inviteLink')} <input readOnly dir="ltr" value={url} onFocus={(event) => event.currentTarget.select()} className="mt-2 min-h-12 w-full rounded-control border border-line bg-bg px-3 text-ink" />
        </label>
        <a href={whatsappUrl({ text: inviteMessage(captainFirstName, url, t) })} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-control bg-lime px-4 font-bold text-on-lime">{t('sendOnWhatsApp')}</a>
        <Button variant="ghost" onClick={copy} className="w-full min-h-12">{t('copyLink')}</Button>
        {copyMessage && <p role="status" className="text-sm text-muted">{copyMessage}</p>}
      </div>}
    </dialog>
  );
}

'use client';
import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useDemoExpiry } from '@/features/demo';
import { Button, LoadingState } from '@/ui';
import { messages } from '../invites/messages';

const InviteContent = dynamic(() => import('./invite-content').then(module => module.InviteContent), {
  loading: () => <LoadingState variant="list" />,
});

export function InviteSheet({ captainFirstName, onClose }: { captainFirstName: string; onClose: () => void }) {
  const t = useT(messages);
  const demo = useDemoExpiry();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} aria-labelledby="invite-heading" onCancel={event => { event.preventDefault(); onClose(); }}
    className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-6 text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
    <header className="mb-6 flex items-center justify-between gap-4">
      <h2 id="invite-heading" className="text-2xl font-extrabold">{t('title')}</h2>
      <Button variant="ghost" aria-label={t('close')} onClick={onClose} className="min-h-12 min-w-12 px-0"><X aria-hidden className="size-5" /></Button>
    </header>
    {demo ? <p className="text-muted">{t('demo')}</p> : <InviteContent captainFirstName={captainFirstName} />}
  </dialog>;
}

'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useId, useRef } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/ui';
import { useInstallPrompt } from '../hooks/use-install-prompt';
import { IosSteps } from './ios-steps';

/** Always-available install entry: Android gets the native prompt, iPhone gets the Share steps. */
export function InstallButton({ role = 'player' }: { role?: 'captain' | 'player' }) {
  const t = useT(messages);
  const { platform, install, busy, error } = useInstallPrompt(role);
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  if (platform !== 'android' && platform !== 'ios') return null;
  return <div className="glass space-y-2 rounded-card p-4">
    <Button variant="ghost" className="w-full gap-2" disabled={busy}
      onClick={() => platform === 'ios' ? dialog.current?.showModal() : void install()}>
      <Download aria-hidden className="size-5" />{busy ? t('installing') : t('downloadApp')}
    </Button>
    {error && <p role="alert" className="text-sm text-danger">{t('installationFailedTryAgain')}</p>}
    {platform === 'ios' && <dialog ref={dialog} aria-labelledby={titleId}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-lg rounded-t-card p-6 text-start text-ink backdrop:bg-bg-deep/80 md:mx-auto">
      <h2 id={titleId} className="text-xl font-bold">{t('installOnIphone')}</h2>
      <IosSteps />
      <Button variant="ghost" className="mt-5 w-full" onClick={() => dialog.current?.close()}>{t('close')}</Button>
    </dialog>}
  </div>;
}

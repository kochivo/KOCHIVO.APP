'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useEffect, useId, useRef } from 'react';
import { Check, Share, SquarePlus } from 'lucide-react';
import { Button } from '@/ui';
import { useInstallPrompt } from '../hooks/use-install-prompt';

export function InstallSheet() {
  const t = useT(messages);
  const { visible, platform, dismiss, install, busy, error } = useInstallPrompt();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!visible || !element) return;
    element.showModal();
    return () => element.close();
  }, [visible]);

  if (!visible) return null;
  return <dialog ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); dismiss(); }}
    className="glass-strong fixed start-4 end-4 bottom-28 top-auto m-0 mx-auto max-h-[70dvh] w-auto max-w-lg overflow-y-auto rounded-card p-6 text-start text-ink backdrop:bg-bg-deep/60">
    <h2 id={titleId} className="text-xl font-bold">{t('addKOCHIVOToYourPhone')}</h2>
    <p className="mt-2 text-sm text-muted">{t('worksOfflineAndOpensFaster')}</p>
    {platform === 'ios' && <ol className="mt-5 space-y-4 text-sm">
      <li className="flex items-center gap-3"><Share aria-hidden className="size-6 shrink-0" />{t('tapShare')}</li>
      <li className="flex items-center gap-3"><SquarePlus aria-hidden className="size-6 shrink-0" />{t('chooseAddToHomeScreen')}</li>
      <li className="flex items-center gap-3"><Check aria-hidden className="size-6 shrink-0" />{t('tapAdd')}</li>
    </ol>}
    {error && <p role="alert" className="mt-4 text-sm text-danger">{t('installationFailedTryAgain')}</p>}
    <div className="mt-5 flex flex-col gap-2">
      {platform === 'android' && <Button disabled={busy} onClick={() => void install()}>
        {busy ? t('installing') : t('installApp')}
      </Button>}
      <Button variant="ghost" onClick={dismiss}>{t('notNow')}</Button>
    </div>
  </dialog>;
}

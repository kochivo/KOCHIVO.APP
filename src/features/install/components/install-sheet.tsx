'use client';

import { useEffect, useId, useRef } from 'react';
import { Check, Share, SquarePlus } from 'lucide-react';
import { Button } from '@/ui';
import { useInstallPrompt } from '../hooks/use-install-prompt';

export function InstallSheet() {
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
    <h2 id={titleId} className="text-xl font-bold">نزّل KOCHIVO على موبايلك</h2>
    <p className="mt-2 text-sm text-muted">بيشتغل أوفلاين وبيفتح أسرع</p>
    {platform === 'ios' && <ol className="mt-5 space-y-4 text-sm">
      <li className="flex items-center gap-3"><Share aria-hidden className="size-6 shrink-0" />اضغط على زرار المشاركة</li>
      <li className="flex items-center gap-3"><SquarePlus aria-hidden className="size-6 shrink-0" />اختار إضافة للشاشة الرئيسية</li>
      <li className="flex items-center gap-3"><Check aria-hidden className="size-6 shrink-0" />اضغط إضافة</li>
    </ol>}
    {error && <p role="alert" className="mt-4 text-sm text-danger">التثبيت ماكملش. جرّب تاني</p>}
    <div className="mt-5 flex flex-col gap-2">
      {platform === 'android' && <Button disabled={busy} onClick={() => void install()}>
        {busy ? 'جاري التثبيت' : 'ثبّت التطبيق'}
      </Button>}
      <Button variant="ghost" onClick={dismiss}>مش دلوقتي</Button>
    </div>
  </dialog>;
}

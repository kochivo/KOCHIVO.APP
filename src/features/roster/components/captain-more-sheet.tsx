'use client';

import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { CaptainNavGroups } from './captain-nav-groups';
import { frameMessages } from './captain-frame-messages';
import type { FrameCounts, FrameId } from './captain-frame-model';
import { CaptainAccountMenu } from './captain-account-menu';

export function CaptainMoreSheet({ active, counts, onClose }: { active: FrameId; counts: FrameCounts; onClose: () => void }) {
  const t = useT(frameMessages);
  return <ResponsiveDialog modal aria-label={t('more')} fallbackId="captain-more" openerId="captain-more" onDismiss={onClose}
    className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-[26px] border border-line bg-surface p-stack pb-[calc(1rem+var(--safe-bottom))] text-ink backdrop:bg-bg/70 min-[760px]:mx-auto min-[760px]:max-w-lg">
    <div className="mx-auto h-1 w-10 rounded-full bg-surface-raised" />
    <div className="flex items-center justify-between"><h2 className="px-inline text-sm font-semibold">{t('more')}</h2>
      <button type="button" onClick={onClose} aria-label={t('close')} className="flex min-h-12 min-w-12 items-center justify-center rounded-full"><X className="size-5" aria-hidden /></button>
    </div>
    <CaptainNavGroups active={active} counts={counts} tiles onNavigate={onClose} />
    <div className="mt-stack"><CaptainAccountMenu placement="sheet" onNavigate={onClose} /></div>
  </ResponsiveDialog>;
}

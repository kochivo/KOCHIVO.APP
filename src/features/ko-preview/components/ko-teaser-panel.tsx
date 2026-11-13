'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { localeDir } from '@/core/i18n/locale';
import { KoAvatar } from '@/ui/ko-avatar';
import type { KoRole } from '@/features/ko-core';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { Button } from '@/ui/button';
import { joinWaitlist } from '@/features/ko-entry';
import { koEntryMessages as messages } from '@/features/ko-entry';

export function KoTeaserPanel({ role, userId, joined: initialJoined, readFailed = false, openerId, onClose, onJoined }: {
  role: KoRole; userId: string; joined: boolean; readFailed?: boolean; openerId: string;
  onClose: () => void; onJoined: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [joined, setJoined] = useState(initialJoined);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  async function join() {
    if (pending.current) return;
    pending.current = true;
    setFailed(false);
    setJoined(true);
    if (await joinWaitlist(userId, role)) onJoined();
    else { setJoined(false); setFailed(true); }
    pending.current = false;
  }
  return <ResponsiveDialog modal dir={localeDir(locale)} aria-labelledby={`${openerId}-title`}
    fallbackId={openerId} openerId={openerId} onDismiss={onClose}
    className="sheet fixed inset-auto start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+4.5rem)] z-50 m-0 max-h-[75dvh] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-card border border-line p-5 text-start text-ink shadow-xl lg:bottom-24">
    {captainWorkspaceEnabled() ? <IconButton type="button" onClick={onClose} aria-label={t('close')}
      className="ms-auto grid min-h-12 min-w-12 place-items-center rounded-control hover:bg-surface-raised">
      <X aria-hidden className="size-5" />
    </IconButton> : <button type="button" onClick={onClose} aria-label={t('close')}
      className="ms-auto grid min-h-12 min-w-12 place-items-center rounded-control hover:bg-surface-raised">
      <X aria-hidden className="size-5" />
    </button>}
    <KoAvatar expression="welcome" className="mx-auto size-24" />
    <h2 id={`${openerId}-title`} className="mt-3 text-xl font-extrabold">{t('title')}</h2>
    <p className="mt-2 text-sm text-muted">{t('introduction')}</p>
    <ul className="my-6 space-y-2">
      {([1, 2, 3] as const).map(n => <li key={n} className="rounded-control border border-line bg-surface-raised px-3 py-3 text-sm">
        {t(`${role}${n}`)}
      </li>)}
    </ul>
    {joined ? <p role="status" className="flex items-center gap-2 rounded-control bg-lime-soft p-3 text-sm">
      <Check aria-hidden className="size-5 shrink-0 text-lime" />{t('joined')}
    </p> : <Button className="min-h-12 w-full" onClick={() => void join()}>{t('join')}</Button>}
    {failed && <p role="alert" className="mt-3 text-sm text-danger">{t('joinError')}</p>}
    {readFailed && !joined && !failed && <p role="alert" className="mt-3 text-sm text-muted">{t('readError')}</p>}
  </ResponsiveDialog>;
}

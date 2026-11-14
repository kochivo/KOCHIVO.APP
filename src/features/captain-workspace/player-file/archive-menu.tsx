'use client';
import { useState, useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { v11Messages } from './v11-messages';

export function ArchiveMenu({ playerId, confirmText, archivingText, errorText, archive }: {
  playerId: string; confirmText: string; archivingText: string; errorText: string;
  archive: (playerId: unknown) => Promise<{ success: true } | { error: string }>;
}) {
  const t = useT(v11Messages);
  const router = useRouter();
  const [pending, startTransition] = useTransition(), [error, setError] = useState('');
  return <details className="relative">
    <summary aria-label={t('more')} className="glass grid min-h-12 min-w-12 cursor-pointer list-none place-items-center rounded-full"><MoreHorizontal aria-hidden className="size-5" /></summary>
    <div className="glass-strong absolute end-0 z-20 mt-2 w-56 rounded-control border border-line p-2">
      <button disabled={pending} className="min-h-12 w-full rounded-control px-3 text-start text-sm disabled:opacity-50" onClick={() => {
        if (!window.confirm(confirmText)) return;
        setError('');
        startTransition(async () => {
          try {
            const result = await archive(playerId);
            if ('error' in result) setError(result.error);
            else { router.push('/captain/players'); router.refresh(); }
          } catch { setError(errorText); }
        });
      }}>{pending ? archivingText : t('archive')}</button>
      {error && <p role="alert" className="p-2 text-xs text-danger">{error}</p>}
    </div>
  </details>;
}

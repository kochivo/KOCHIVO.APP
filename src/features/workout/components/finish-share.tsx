'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { messages } from '../finish-messages';

export function FinishShare() {
  const t = useT(messages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function share() {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch('/api/share/rank?kind=rank', { cache: 'no-store' });
      if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/png')) throw new Error('share');
      const file = new File([await response.blob()], 'kochivo-rank.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else {
        const url = URL.createObjectURL(file);
        try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click(); }
        finally { URL.revokeObjectURL(url); }
      }
    } catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) setError(true); }
    finally { setBusy(false); }
  }
  if (!ranksEnabled()) return null;
  return <div className="space-y-2"><button type="button" disabled={busy} onClick={() => void share()}
    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-line-soft px-5">
    <Share2 aria-hidden className="size-5" />{t('share')}</button>
    {error && <p role="alert" className="text-sm text-danger">{t('shareError')}</p>}
  </div>;
}

'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { messages } from '../finish-messages';
import { messages as workoutMessages } from '../messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';

export function FinishShare() {
  const t = useT(messages);
  const wt = useT(workoutMessages);
  const v3 = captainWorkspaceEnabled();
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
  if (!ranksEnabled()) return v3 ? <Button type="button" disabled variant={'secondary'} block={false} className={"min-h-[52px] w-full text-sm font-bold text-muted"}>{wt('v3Share')} · {wt('v3Soon')}</Button> : null;
  return <div className="space-y-inline"><Button type="button" disabled={busy} onClick={() => void share()}
    variant={'secondary'} block={false} className={"flex min-h-[52px] w-full items-center justify-center gap-inline px-page-x text-sm font-bold"}>
    {!v3 && <Share2 aria-hidden className="size-5" />}{v3 ? wt('v3Share') : t('share')}</Button>
    {error && <p role="alert" className="text-sm text-danger">{t('shareError')}</p>}
  </div>;
}

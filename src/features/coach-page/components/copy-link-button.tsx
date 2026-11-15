'use client';

import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from '../messages';

export function CopyLinkButton({ url, label }: { url: string; label?: string }) {
  const t = useT(messages);
  const [status, setStatus] = useState('');
  return <div className="min-w-0 space-y-inline">
    <Button type="button" variant="secondary" className="min-h-12" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setStatus(t('copied')); }
      catch { setStatus(t('copyFailed')); }
    }}>{label ?? t('copyLink')}</Button>
    <p role="status" className="text-sm text-muted">{status}</p>
  </div>;
}

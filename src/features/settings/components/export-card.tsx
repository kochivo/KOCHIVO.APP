'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import { Button } from '@/ui';
import { exportMyData } from '../data/settings';
import { buildExport, exportFileName } from '../export';

export function ExportCard() {
  const t = useT(messages);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function download() {
    setPending(true); setMessage('');
    try {
      const result = await exportMyData();
      if (result.error || !result.data) { setMessage(result.error ?? t('tryAgain')); return; }
      const now = new Date();
      const blob = new Blob([JSON.stringify(buildExport(result.data, now), null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      try {
        anchor.href = url; anchor.download = exportFileName(now);
        document.body.append(anchor); anchor.click();
        setMessage(t('yourDataFileIsReady'));
      } finally { anchor.remove(); URL.revokeObjectURL(url); }
    } catch { setMessage(t('downloadFailedTryAgain')); }
    finally { setPending(false); }
  }
  return <section className="glass space-y-card-gap rounded-card p-section">
    <h2 className="text-lg font-bold">{t('downloadYourData')}</h2>
    <p className="text-sm text-muted">{t('oneFileWithYourDataPhotos')}</p>
    <Button variant="secondary" className="min-h-12" disabled={pending} onClick={() => void download()}>
      {pending ? t('preparingYourData') : t('downloadYourData')}
    </Button>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}

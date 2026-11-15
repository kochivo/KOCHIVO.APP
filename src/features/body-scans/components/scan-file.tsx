'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FileText } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button, LoadingState } from '@/ui';
import { scanUrl } from '../data/scans';
import { messages } from '../messages';

export function ScanFile({ path }: { path: string | null }) {
  const t = useT(messages);
  const [url, setUrl] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (path && !path.endsWith('.pdf')) {
      void scanUrl(path).then(value => { if (!cancelled) { setUrl(value); setFailed(false); } })
        .catch(() => { if (!cancelled) setFailed(true); });
    }
    return () => { cancelled = true; };
  }, [path, retry]);
  if (!path) return <p className="text-sm text-muted">{t('noFile')}</p>;
  if (path.endsWith('.pdf')) return <div>
    <Button variant="secondary" className="min-h-12" onClick={() => {
      // Open synchronously to retain the browser's user gesture, then sign a fresh URL.
      const tab = window.open('about:blank', '_blank');
      if (tab) tab.opener = null;
      void scanUrl(path).then(value => {
        if (tab) tab.location.href = value;
        else window.location.assign(value);
        setFailed(false);
      }).catch(() => { tab?.close(); setFailed(true); });
    }}><FileText aria-hidden />{t('pdf')}</Button>
    {failed && <p role="alert" className="text-muted">{t('fileLoadError')}</p>}
  </div>;
  if (failed) return <div><p role="alert" className="text-muted">{t('fileLoadError')}</p>
    <Button variant="secondary" className="min-h-12" onClick={() => { setFailed(false); setUrl(''); setRetry(value => value + 1); }}>{t('retry')}</Button></div>;
  return <div className="space-y-inline overflow-hidden rounded-control">
    {url ? <Image src={url} alt={revealed ? t('image') : ''} width={400} height={300} unoptimized
      onError={() => setFailed(true)} className={`h-48 w-full object-contain ${revealed ? '' : 'blur-xl'}`} /> : <LoadingState />}
    <Button variant="secondary" className="min-h-12 w-full" disabled={!url} aria-pressed={revealed}
      onClick={() => setRevealed(value => !value)}>{t(revealed ? 'hide' : 'reveal')}</Button>
  </div>;
}

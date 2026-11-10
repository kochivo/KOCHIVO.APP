'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from '../messages';

export async function shareRankFile(file: File) {
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ShareRankButton({ kind, disabled = false }: { kind: 'rank' | 'crown'; disabled?: boolean }) {
  const t = useT(messages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function share() {
    if (loading) return;
    setLoading(true); setError(false);
    try {
      const response = await fetch(`/api/share/rank?kind=${kind}`, { cache: 'no-store' });
      if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/png')) throw new Error('Share image unavailable');
      await shareRankFile(new File([await response.blob()], `kochivo-${kind}.png`, { type: 'image/png' }));
    } catch (failure) {
      if (!(failure instanceof Error && failure.name === 'AbortError')) setError(true);
    } finally {
      setLoading(false);
    }
  }
  return <div className="space-y-2">
    <Button variant="secondary" className="min-h-12" disabled={disabled || loading} aria-busy={loading} onClick={() => void share()}>
      <Share2 size={20} aria-hidden="true" />{t(loading ? 'shareLoading' : 'share')}
    </Button>
    {error && <p role="alert" className="text-sm text-danger">{t('shareError')}</p>}
  </div>;
}

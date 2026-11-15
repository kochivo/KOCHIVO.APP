'use client';
import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../privacy/messages';
export function LockedPhoto({ url, alt, locked, onError }: { url: string; alt: string; locked: boolean; onError: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const t = useT(messages);
  const image = (
    // Signed private URLs bypass the image optimizer and its shared cache.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" decoding="async" width={480} height={640} referrerPolicy="no-referrer" className={`aspect-[3/4] w-full rounded-control object-cover ${locked && !revealed ? 'blur-md' : ''}`} onError={onError} />
  );
  return locked && !revealed ? <button type="button" aria-label={t('reveal')} onClick={() => setRevealed(true)} className="press relative min-h-12 w-full cursor-pointer overflow-hidden rounded-control border border-line hover:border-lime focus-visible:ring-2 focus-visible:ring-lime">
    {image}<LockKeyhole aria-hidden className="absolute inset-0 m-auto size-6 text-ink" />
  </button> : image;
}

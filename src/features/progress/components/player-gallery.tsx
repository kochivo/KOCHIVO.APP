'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { ErrorState, LoadingState } from '@/ui';
import { messages } from '../messages';
import { signGallery } from '../data/gallery';
import type { GalleryWeek } from '../gallery';
import type { CheckIn } from '../data/checkins';
import { ProgressGallery } from './progress-gallery';
import { useCycle } from '@/features/player-home';

export function PlayerGallery({ checkins }: { checkins: CheckIn[] }) {
  const t = useT(messages);
  const cycle = useCycle(checkins[0]?.player_id);
  const [result, setResult] = useState<{ rows: CheckIn[]; weeks: GalleryWeek[]; failed: boolean }>();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const client = await loadSupabaseBrowser();
        const signed = await signGallery(checkins, client);
        if (!cancelled) setResult({ rows: checkins, ...signed });
      } catch { if (!cancelled) setError(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, [checkins, retry]);
  if (checkins.length && cycle.error) return <ErrorState message={t('couldntLoadPhotos')} retryLabel={t('tryAgain')} onRetry={() => void cycle.retry()} />;
  if (checkins.length && !cycle.data) return <LoadingState />;
  if (error) return <ErrorState message={t('couldntLoadPhotos')} retryLabel={t('tryAgain')} onRetry={() => {
    setError(false); setResult(undefined); setRetry(value => value + 1);
  }} />;
  if (result?.rows !== checkins) return <LoadingState />;
  return <>
    {result.failed && <ErrorState message={t('couldntLoadPhotos')} retryLabel={t('tryAgain')} onRetry={() => {
      setResult(undefined); setRetry(value => value + 1);
    }} />}
    <ProgressGallery key={retry} weeks={result.weeks} locked={cycle.data?.female === true} />
  </>;
}

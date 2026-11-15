'use client';
import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { parseExerciseVideo } from '@/lib/exercise-video';
import { videoMessages } from '../video-messages';
import { ExerciseVideo } from './exercise-video';

export function ExerciseVideoPreview({ url, name, invalidMessage }: { url: string; name: string; invalidMessage?: string }) {
  const t = useT(videoMessages);
  const [settled, setSettled] = useState(url);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(url), 300);
    return () => window.clearTimeout(timer);
  }, [url]);
  const source = parseExerciseVideo(settled);
  return <div className="space-y-stack">
    {settled.trim() && <div aria-live="polite">
      {!source ? <p role="alert" className="text-sm text-danger">{invalidMessage ?? t('invalid')}</p> :
        source.kind === 'external' ? <p className="text-sm text-warn">{t('external')}</p> : <>
          <p className="flex items-center gap-inline text-sm text-lime"><CheckCircle aria-hidden className="size-5" />{t('valid', { label: t(source.label) })}</p>
          <ExerciseVideo key={settled} url={settled} name={name} />
        </>}
    </div>}
    <div className="flex flex-wrap gap-inline">{(['youtube', 'shorts', 'drive', 'mp4'] as const).map(key =>
      <span key={key} className="rounded-full border border-line-soft bg-surface-raised px-stack py-inline text-xs text-muted">{t(key)}</span>)}</div>
  </div>;
}

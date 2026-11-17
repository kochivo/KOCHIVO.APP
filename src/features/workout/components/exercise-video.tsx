'use client';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Play } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { parseExerciseVideo } from '@/lib/exercise-video';
import { Button, buttonClass } from '@/ui/button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../messages';
import { videoMessages } from '../video-messages';
import { watchVideoStall, youtubeOrigin } from '../video-stall';

function online() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
function serverOnline() { return true; }
function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener); };
}

export function ExerciseVideo({ url, name, compact = false }: { url?: string | null; name: string; compact?: boolean }) {
  const t = useT(videoMessages);
  const wt = useT(messages);
  const id = useId();
  const connected = useSyncExternalStore(subscribe, online, serverOnline);
  const [opened, setOpened] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const monitor = useRef<ReturnType<typeof watchVideoStall> | null>(null);
  const source = parseExerciseVideo(url, typeof window === 'undefined' ? undefined : window.location.origin);
  const youtube = source?.kind === 'youtube';
  useEffect(() => {
    if (!opened || !youtube || !connected) return;
    const watcher = watchVideoStall(() => setStalled(true));
    monitor.current = watcher;
    watcher.send({ type: 'start' });
    const message = (event: MessageEvent<unknown>) => {
      if (event.source === frame.current?.contentWindow) watcher.send({ type: 'message', origin: event.origin, data: event.data });
    };
    window.addEventListener('message', message);
    return () => { watcher.dispose(); monitor.current = null; window.removeEventListener('message', message); };
  }, [opened, youtube, connected, url, attempt]);
  if (!source) return null;
  const unavailable = !connected || failedUrl === url;
  const close = () => setOpened(false);
  const warning = <div className="space-y-stack"><p role="status" className="rounded-control border border-warn/30 bg-warn-soft p-stack text-sm text-warn">{t('offline')}</p>
    {connected && failedUrl === url && <Button variant="secondary" onClick={() => { setLoaded(false); setFailedUrl(null); }}>{wt('tryAgain')}</Button>}</div>;
  const label = t(source.label);
  const portraitClass = 'mx-auto aspect-[9/16] h-auto max-h-[55dvh] w-[min(100%,30.9375dvh)]';
  const mediaClass = source.kind !== 'external' && source.vertical ? portraitClass : 'mx-auto aspect-video h-auto max-h-[55dvh] w-full';
  return <div className="space-y-stack">
    {source.kind === 'external' ? <div className="glass flex flex-wrap items-center gap-stack rounded-card p-stack">
      <span className="text-xs text-muted">{label}</span>
      {unavailable ? warning : <a id={id} href={source.url} target="_blank" rel="noopener noreferrer"
        className={buttonClass({ variant: 'secondary' })}>{t('open')}</a>}
    </div> : <>
      <Button id={id} type="button" variant="secondary" aria-disabled={unavailable} onClick={() => { if (!unavailable) { setLoaded(false); setStalled(false); setOpened(true); } }}
        aria-label={`${t('open')}: ${name}`} aria-haspopup="dialog"
        className={compact ? 'inline-flex min-h-12 items-center gap-inline' : 'glass relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-card p-card'}>
        <span className={`grid place-items-center rounded-full ${compact ? 'size-5' : 'size-12'} ${compact && !unavailable ? 'bg-lime text-on-lime' : 'text-muted'}`}>
          <Play aria-hidden className={compact ? 'size-3' : 'size-7'} fill="currentColor" />
        </span>
        <span className={compact ? 'text-xs' : 'absolute start-stack top-stack rounded-full border border-line-soft bg-bg-deep/80 px-stack py-inline text-micro text-ink'}>{t('coach')}</span>
        {!compact && <span className="absolute bottom-stack end-stack rounded-control bg-bg-deep/80 px-inline py-inline text-micro text-muted">{label}</span>}
      </Button>
      {unavailable && warning}
      {opened && <ResponsiveDialog modal openerId={id} fallbackId={id} onDismiss={close} onClose={close} title={name}
        className="sheet fixed inset-0 z-50 m-auto h-dvh max-h-dvh w-full max-w-none overflow-y-auto p-card text-ink backdrop:bg-bg-deep/80"
        footer={<Button variant="secondary" block onClick={close}>{t('back')}</Button>}>
        <div className="space-y-card-gap">
          {!unavailable && !loaded && <p role="status" className="glass-strong rounded-control p-stack text-sm text-muted">{t('loading')}</p>}
          {unavailable ? warning : source.kind === 'file' ?
            <video className={mediaClass} src={source.embedUrl} controls muted playsInline autoPlay aria-label={name}
              onLoadedMetadata={event => {
                if (event.currentTarget.videoHeight > event.currentTarget.videoWidth) event.currentTarget.className = portraitClass;
              }} onCanPlay={() => setLoaded(true)} onError={() => setFailedUrl(url ?? null)} /> :
            <iframe key={attempt} ref={frame} className={mediaClass} src={source.embedUrl} title={name}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin" loading="lazy" onLoad={() => {
                setLoaded(true);
                if (youtube) {
                  frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), youtubeOrigin);
                  monitor.current?.send({ type: 'start' });
                }
              }} onError={() => youtube ? setStalled(true) : setFailedUrl(url ?? null)} />}
          {(source.kind === 'youtube' || source.kind === 'drive') && <a href={url?.trim()} target="_blank" rel="noopener noreferrer"
            className={`${buttonClass({ variant: 'secondary' })} text-xs`}>{t(youtube ? 'openYoutube' : 'open')}</a>}
          {youtube && stalled && <div role="status" className="glass-strong space-y-stack rounded-control p-stack">
            <p className="text-sm text-muted">{t('stalled')}</p>
            <a href={url?.trim()} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'primary', block: true })}>{t('openYoutubeFull')}</a>
            <Button variant="secondary" block onClick={() => { setStalled(false); setLoaded(false); setAttempt(value => value + 1); }}>{t('retry')}</Button>
          </div>}
          <p className="text-center text-sm text-muted">{t('muted')}</p>
          {unavailable && connected && <a href={url?.trim()} target="_blank" rel="noopener noreferrer"
            className={buttonClass({ variant: 'secondary' })}>{t('open')}</a>}
        </div>
      </ResponsiveDialog>}
    </>}
  </div>;
}

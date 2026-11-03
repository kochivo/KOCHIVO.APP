'use client';
import { Pause, Play } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './icon-button';
import { ProgressBar } from './progress-bar';

export interface AudioPlayerProps {
  src: string;
  /** Known length; browsers report Infinity for freshly recorded webm files. */
  durationSeconds: number;
  playLabel: string;
  pauseLabel: string;
  formatTime: (seconds: number) => string;
  onPlay?: () => void;
  onError?: () => void;
  className?: string;
}

export function AudioPlayer({ src, durationSeconds, playLabel, pauseLabel, formatTime, onPlay, onError, className }: AudioPlayerProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => onError?.());
    else element.pause();
  };
  return (
    <div className={cn('glass-raised flex items-center gap-3 rounded-control p-2 pe-4', className)}>
      <IconButton aria-label={playing ? pauseLabel : playLabel} onClick={toggle} className="bg-lime text-on-lime hover:bg-lime">
        {playing ? <Pause aria-hidden className="size-5 fill-current" /> : <Play aria-hidden className="size-5 fill-current" />}
      </IconButton>
      <ProgressBar value={position} max={durationSeconds} className="flex-1" aria-label={playLabel} />
      <span className="font-display text-sm tabular-nums text-muted" dir="ltr">{formatTime(playing || position > 0 ? position : durationSeconds)}</span>
      <audio ref={audio} src={src} preload="none" onError={onError}
        onPlay={() => { setPlaying(true); onPlay?.(); }} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPosition(0); }}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} />
    </div>
  );
}

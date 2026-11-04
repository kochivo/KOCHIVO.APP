'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';


import { useState } from 'react';
import type { ReactNode } from 'react';
import { getContent } from '../content';

export function PreviewToggle({ player, rest, captain }: { player: ReactNode; rest: ReactNode; captain: ReactNode }) {
  const t = useT(messages);
  const content = getContent(t);
  const [view, setView] = useState<'player' | 'rest' | 'captain'>('player');
  return <div className="mx-auto flex w-full max-w-[340px] flex-col items-center gap-3">
    <div className="glass flex w-full max-w-[310px] gap-1 rounded-control p-1" role="group" aria-label={content.preview.label}>
      {(['player', 'rest', 'captain'] as const).map(value => <button key={value} type="button" aria-pressed={view === value} aria-controls={`preview-${value}`} onClick={() => setView(value)} className={`min-h-12 flex-1 rounded-xl px-2 text-sm font-extrabold ${view === value ? 'bg-ink text-on-lime' : 'text-ink hover:bg-ink/5'}`}>{content.preview[value]}</button>)}
    </div>
    <div className="w-full max-w-[310px]">
      <div data-mood={view === 'rest' ? 'rest' : undefined} className="glass-strong h-[560px] rounded-[48px] p-3.5">
        <div id="preview-player" hidden={view !== 'player'} className="h-full">{player}</div>
        <div id="preview-rest" hidden={view !== 'rest'} className="h-full">{rest}</div>
        <div id="preview-captain" hidden={view !== 'captain'} className="h-full">{captain}</div>
      </div>
    </div>
    <p className="text-xs text-muted">{content.preview.label}</p>
  </div>;
}

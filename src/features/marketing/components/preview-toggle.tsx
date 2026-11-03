'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { content } from '../content';

export function PreviewToggle({ player, captain }: { player: ReactNode; captain: ReactNode }) {
  const [view, setView] = useState<'player' | 'captain'>('player');
  return <div className="mx-auto flex w-full max-w-[340px] flex-col items-center gap-3">
    <div className="glass flex w-full max-w-[310px] gap-1 rounded-control p-1" role="group" aria-label={content.preview.label}>
      {(['player', 'captain'] as const).map(value => <button key={value} type="button" aria-pressed={view === value} aria-controls={`preview-${value}`} onClick={() => setView(value)} className={`min-h-12 flex-1 rounded-xl px-2 text-sm font-extrabold ${view === value ? 'bg-ink text-on-lime' : 'text-ink hover:bg-ink/5'}`}>{content.preview[value]}</button>)}
    </div>
    <div className="marketing-phone w-full max-w-[310px]">
      <div className="glass-strong h-[560px] rounded-[48px] p-3.5">
        <div id="preview-player" hidden={view !== 'player'} className="h-full">{player}</div>
        <div id="preview-captain" hidden={view !== 'captain'} className="h-full">{captain}</div>
      </div>
    </div>
    <p className="text-xs text-muted">{content.preview.label}</p>
  </div>;
}

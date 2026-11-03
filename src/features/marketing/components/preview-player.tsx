import { Dumbbell } from 'lucide-react';
import { content } from '../content';

export function PreviewPlayer() {
  const p = content.preview;
  return <div className="flex h-full flex-col gap-3 rounded-[36px] bg-bg-deep px-4 py-5">
    <p className="text-[10px] text-muted">{p.day}</p>
    <div className="glass flex items-center gap-2 rounded-[20px] p-3"><Dumbbell className="size-14 shrink-0 rounded-control bg-ink p-3 text-bg" aria-hidden="true" /><p className="font-display text-lg font-extrabold">{p.exercise}</p></div>
    <div className="glass-strong flex flex-col items-center gap-1 rounded-card p-3.5">
      <p className="text-[10px] text-muted">{p.weightLabel}</p>
      <div className="flex w-full items-center justify-between"><span aria-hidden="true" className="grid size-13 place-items-center rounded-control bg-ink/5 text-2xl">{p.plus}</span><span className="text-5xl font-extrabold">{p.weight}</span><span aria-hidden="true" className="grid size-13 place-items-center rounded-control bg-ink/5 text-2xl">{p.minus}</span></div>
    </div>
    <div className="flex flex-col items-center gap-1 rounded-card border border-lime/50 bg-lime-soft p-3.5"><p className="text-xs font-bold text-lime">{p.pr}</p><p className="font-display text-lg font-extrabold">{p.record}</p></div>
    <span className="mt-auto grid min-h-14 place-items-center rounded-control bg-lime font-display text-lg font-extrabold text-on-lime">{p.done}</span>
  </div>;
}

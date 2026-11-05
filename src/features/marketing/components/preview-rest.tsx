import { Droplet, Moon } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { getContent } from '../content';
import { messages } from '../messages';

export async function PreviewRest() {
  const p = getContent(await getT(messages)).preview;
  return <div data-mood="rest" className="flex h-full flex-col items-center gap-4 rounded-[36px] bg-bg-deep px-4 py-4 text-ink">
    <Moon aria-hidden="true" size={40} className="shrink-0 text-calm" />
    <p className="text-center font-display text-xl font-extrabold">{p.restDay}</p>
    <div className="glass-strong w-full space-y-3 rounded-card p-3">
      <p className="text-sm font-bold">{p.sleepQuestion}</p>
      <div className="flex gap-1" aria-hidden="true">{p.sleepHours.map((hours, index) => <span key={hours} className={`grid min-h-12 flex-1 place-items-center rounded-control ${index === 2 ? 'bg-calm font-bold text-on-lime' : 'bg-surface-raised text-muted'}`}>{hours}</span>)}</div>
      <p className="text-sm text-calm">{p.muscles}</p>
    </div>
    <div className="glass flex w-full flex-col items-center gap-2 rounded-card p-3">
      <Droplet aria-hidden="true" size={32} className="text-water" />
      <p className="text-sm">{p.waterGlass}</p><p dir="ltr" className="text-lg font-bold text-water">{p.water}</p>
    </div>
  </div>;
}

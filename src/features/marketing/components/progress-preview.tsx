import { getT } from '@/core/i18n/server';
import { getContent } from '../content';
import { messages } from '../messages';

export async function ProgressPreview() {
  const p = getContent(await getT(messages)).progress;
  return <div className="glass-strong space-y-3 rounded-card p-5">
    <p className="text-xs text-muted">{p.title}</p><p className="text-sm font-bold">{p.exercise}</p>
    <div className="flex flex-wrap items-center gap-3"><span className="text-3xl font-extrabold">{p.weight}</span><span className="rounded-full bg-lime-soft px-3 py-1 text-xs font-bold text-lime">{p.record}</span></div>
    <svg aria-hidden="true" viewBox="0 0 280 80" className="h-20 w-full" fill="none">
      <path d="M5 70 H275 M5 40 H275 M5 10 H275" className="stroke-line" />
      <path d="M5 65 L43 61 L82 49 L120 51 L159 35 L197 27 L236 20 L275 8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="stroke-lime" />
      <circle cx="275" cy="8" r="4" className="fill-lime" />
    </svg>
    <p className="text-xs text-muted">{p.sample}</p>
  </div>;
}

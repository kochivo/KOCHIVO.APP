import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';

export async function PreviewCaptain() {
  const t = await getT(messages);
  const content = getContent(t);
  return <div className="flex h-full flex-col gap-2.5 rounded-[36px] bg-bg-deep px-4 py-5">
    <p className="text-[10px] text-muted">{content.preview.radar}</p>
    <p className="font-display text-[22px] font-extrabold">{content.preview.heading}</p>
    {content.radar.map(row => <div key={row.name} className="glass flex flex-col gap-1.5 rounded-[18px] p-3">
      <div className="flex items-center justify-between gap-2"><span className="text-sm font-extrabold">{row.name}</span><span className="text-[11px] font-bold text-danger">{row.days}</span></div>
      <p className="text-xs text-muted">{row.reason}</p>
      <span className="self-start rounded-full bg-lime-soft px-3 py-1.5 text-xs font-bold text-lime">{content.preview.send}</span>
    </div>)}
    <div className="glass mt-auto flex items-center justify-between rounded-[18px] p-3"><span className="text-xs font-bold">{content.preview.waiting}</span><span className="text-xl font-extrabold text-ink">{content.preview.videos}</span></div>
  </div>;
}

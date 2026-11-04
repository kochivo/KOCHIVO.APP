import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';
import { ProgressPreview } from './progress-preview';

export async function PlayerSection() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section id="players" className="marketing-wrap marketing-reveal marketing-section">
    <div className="glass-strong flex flex-wrap items-center gap-10 rounded-[36px] p-6 md:p-12">
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5"><p className="marketing-eyebrow">{content.playerHeading.label}</p><h2 className="marketing-heading">{content.playerHeading.title}</h2><p className="text-[17px] leading-relaxed text-muted">{content.playerHeading.description}</p>{await ProgressPreview()}</div>
      <div className="grid min-w-0 flex-[1_1_400px] gap-3 sm:grid-cols-2">{content.player.map(item => <article key={item.t} className="glass space-y-1.5 rounded-[22px] p-[18px]"><h3 className="text-[17px] font-extrabold">{item.t}</h3><p className="text-[13px] leading-relaxed text-muted">{item.d}</p></article>)}</div>
    </div>
  </section>;
}

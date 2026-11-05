import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';

export async function HowItWorks() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section id="how" className="marketing-wrap marketing-reveal marketing-section flex flex-wrap items-center gap-10">
    <div className="flex flex-[1_1_460px] flex-col gap-6">
      <p className="marketing-eyebrow">{content.how.label}</p><h2 className="marketing-heading">{content.how.title[0]}<br />{content.how.title[1]}</h2>
      <ol className="flex flex-col gap-6">{content.steps.map(step => <li key={step.n} className="flex items-start gap-4"><span className="grid size-13 shrink-0 place-items-center rounded-control bg-surface-raised font-display text-[22px] font-extrabold text-ink">{step.n}</span><div className="space-y-1.5"><h3 className="text-xl font-extrabold">{step.t}</h3><p className="text-[15px] leading-relaxed text-muted">{step.d}</p></div></li>)}</ol>
    </div>
    <div className="glass-strong flex min-w-0 flex-[1_1_420px] flex-col gap-2.5 rounded-[32px] p-5 sm:p-6">
      <p className="text-xs text-muted">{content.how.today}</p>
      {content.feed.map(item => <div key={item.at} className="glass flex items-center gap-3 rounded-[18px] px-4 py-3.5"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-lime" /><p className="grow text-sm font-bold">{item.t}</p><span dir="ltr" className="text-xs text-muted">{item.at}</span></div>)}
      <p className="text-xs text-muted">{content.how.example}</p>
    </div>
  </section>;
}

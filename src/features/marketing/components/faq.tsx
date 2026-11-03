import { Plus } from 'lucide-react';
import { content } from '../content';

export function Faq() {
  return <section id="faq" className="marketing-wrap marketing-reveal marketing-section flex flex-wrap gap-10">
    <div className="flex-[1_1_300px] space-y-3"><p className="marketing-eyebrow">{content.faqHeading.label}</p><h2 className="marketing-heading">{content.faqHeading.title}</h2></div>
    <div className="flex flex-[2_1_560px] flex-col gap-2.5">{content.faq.map(item => <details key={item.q} className="glass group rounded-[20px]"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-[22px] py-5 font-display text-[17px] font-extrabold [&::-webkit-details-marker]:hidden">{item.q}<Plus size={22} aria-hidden="true" className="shrink-0 text-lime group-open:rotate-45" /></summary><p className="px-[22px] pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p></details>)}</div>
  </section>;
}

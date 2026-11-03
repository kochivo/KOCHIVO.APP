import { content, whatsappUrl } from '../content';

export function WhiteLabelStrip() {
  return <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-6 py-[18px] text-start"><p className="text-[15px] font-bold">{content.whiteLabel}</p><a href={whatsappUrl} className="marketing-ghost glass px-[18px]">{content.contact}</a></div>;
}

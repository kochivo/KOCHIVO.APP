import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent, whatsappUrl } from '../content';

export async function WhiteLabelStrip() {
  const t = await getT(messages);
  const content = getContent(t);
  return <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-6 py-[18px] text-start"><p className="text-[15px] font-bold">{content.whiteLabel}</p><a href={whatsappUrl} className="marketing-ghost glass px-[18px]">{content.contact}</a></div>;
}

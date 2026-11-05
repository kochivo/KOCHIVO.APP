import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import Image from 'next/image';
import { getContent } from '../content';

export async function FinalCta() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section className="marketing-wrap marketing-reveal marketing-section"><div className="glass flex flex-col items-center gap-5 rounded-[36px] px-6 py-14 text-center">
    <Image src="/brand/icon.png" alt="" width={64} height={64} />
    <h2 className="marketing-heading">{content.final.title}</h2>
    <a href={content.links.signup} className="marketing-primary min-h-16 px-8 text-lg">{content.final.action}</a>
  </div></section>;
}

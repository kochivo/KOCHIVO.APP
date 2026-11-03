import Image from 'next/image';
import { content } from '../content';

export function FinalCta() {
  return <section className="marketing-wrap marketing-reveal marketing-section"><div className="glass flex flex-col items-center gap-5 rounded-[36px] px-6 py-14 text-center">
    <Image src="/brand/icon.png" alt="" width={64} height={64} />
    <h2 className="marketing-heading">{content.final.title}</h2>
    <a href={content.links.signup} className="marketing-primary min-h-16 px-8 text-lg">{content.final.action}</a>
  </div></section>;
}

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent, whatsappUrl } from '../content';
import Image from 'next/image';

export async function SiteFooter() {
  const t = await getT(messages);
  const content = getContent(t);
  return <footer className="marketing-wrap flex flex-wrap items-center justify-between gap-4 py-10 pt-14 text-[13px] text-muted">
    <Image src="/brand/logo-primary.png" alt={content.brand} width={92} height={26} className="theme-dark-only" />
    <Image src="/brand/logo-primary-light.png" alt={content.brand} width={92} height={26} className="theme-light-only" />
    <p>{content.footer.copyright} <a className="inline-flex min-h-12 items-center text-lime" href="https://gymvisual.com/">{content.footer.credit}</a></p>
    <div className="flex flex-wrap items-center gap-4"><span>{content.footer.privacy}</span><span>{content.footer.terms}</span><a className="inline-flex min-h-12 items-center hover:text-lime" href={whatsappUrl}>{content.footer.support}</a></div>
  </footer>;
}

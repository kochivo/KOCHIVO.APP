import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent, whatsappUrl } from '../content';

export async function SiteFooter() {
  const t = await getT(messages);
  const content = getContent(t);
  return <footer className="marketing-wrap flex flex-wrap items-center justify-between gap-4 py-10 pt-14 text-[13px] text-muted">
    <p>{content.footer.copyright} <a className="inline-flex min-h-12 items-center text-lime" href="https://gymvisual.com/">{content.footer.credit}</a></p>
    <a className="marketing-ghost border border-line px-3" href={whatsappUrl}>{content.footer.support}</a>
  </footer>;
}

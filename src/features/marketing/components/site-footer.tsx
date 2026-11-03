import { content, whatsappUrl } from '../content';

export function SiteFooter() {
  return <footer className="marketing-wrap flex flex-wrap items-center justify-between gap-4 py-10 pt-14 text-[13px] text-muted">
    <p>{content.footer.copyright} <a className="inline-flex min-h-12 items-center text-lime" href="https://gymvisual.com/">{content.footer.credit}</a></p>
    <a className="marketing-ghost px-3" href={whatsappUrl}>{content.footer.support}</a>
  </footer>;
}

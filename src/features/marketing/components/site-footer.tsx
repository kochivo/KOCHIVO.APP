import Image from 'next/image';
import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent, whatsappUrl } from '../content';
import styles from './landing.module.css';

export async function SiteFooter() {
  const locale = await getLocale();
  const content = getContent(await getT(messages));
  return <footer className={`${styles.wrap} ${styles.footer}`}>
    <Image src="/brand/logo-primary.png" alt={content.brand} width={77} height={22} className="theme-dark-only" />
    <Image src="/brand/logo-primary-light.png" alt={content.brand} width={77} height={22} className="theme-light-only" />
    <p>{content.footer.copyright}{' · '}<a className="press" href="https://gymvisual.com/">{content.footer.credit}</a></p>
    <nav><a className="press inline-flex min-h-12 items-center" href={`/${locale}/privacy`}>{content.footer.privacy}</a><a className="press inline-flex min-h-12 items-center" href={`/${locale}/terms`}>{content.footer.terms}</a><a className="press" href={whatsappUrl}>{content.footer.support}</a></nav>
  </footer>;
}

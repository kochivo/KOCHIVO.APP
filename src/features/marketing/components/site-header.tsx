import Image from 'next/image';
import { getT } from '@/core/i18n/server';
import { Button } from '@/ui';
import { messages } from '../messages';
import { getContent } from '../content';
import { LandingMotion } from './landing-motion';
import styles from './landing.module.css';

export async function SiteHeader() {
  const content = getContent(await getT(messages));
  return <header data-landing-header className="sticky top-0 z-50 border-b border-line bg-bg pt-[var(--safe-top)]">
    <LandingMotion />
    <span data-reading aria-hidden="true" className={styles.progress} />
    <div className={`marketing-wrap flex flex-nowrap items-center justify-between gap-3 ${styles.headerRow}`}>
      <a href="#hero" className="inline-flex min-h-12 shrink-0 items-center">
        <Image src="/brand/logo-primary.png" alt={content.brand} width={132} height={38} preload className="theme-dark-only h-auto w-28 lg:w-33" />
        <Image src="/brand/logo-primary-light.png" alt={content.brand} width={132} height={38} preload className="theme-light-only h-auto w-28 lg:w-33" />
      </a>
      <nav className="hidden items-center gap-5 text-sm lg:flex">{content.nav.map(item => <a key={item.href} href={item.href} className="inline-flex min-h-12 items-center hover:text-lime">{item.label}</a>)}</nav>
      <div className="flex shrink-0 items-center gap-4"><a href={content.links.login} className="hidden min-h-12 items-center text-sm lg:inline-flex">{content.login}</a>
        <form action={content.links.login}><input type="hidden" name="tab" value="signup" /><Button type="submit">{content.signup}</Button></form>
      </div>
    </div>
  </header>;
}

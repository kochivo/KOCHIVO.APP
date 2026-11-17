import Image from 'next/image';
import { getT } from '@/core/i18n/server';
import { buttonClass } from '@/ui/button';
import { LanguageSwitch } from '@/ui/language-switch';
import { ThemeSwitch } from '@/ui/theme-switch';
import { messages } from '../messages';
import { getContent } from '../content';
import { LandingMotion } from './landing-motion';
import styles from './landing.module.css';

export async function SiteHeader() {
  const t = await getT(messages);
  const content = getContent(t);
  return <header data-landing-header className="sticky top-0 z-50 border-b border-line bg-bg pt-[var(--safe-top)]">
    <LandingMotion />
    <div className={`marketing-wrap ${styles.wrap} ${styles.headerRow}`}>
      <a href="#hero" aria-label={content.brand}>
        <Image src="/brand/logo-primary.png" alt={content.brand} width={98} height={28} preload className="theme-dark-only h-7 w-auto" />
        <Image src="/brand/logo-primary-light.png" alt={content.brand} width={98} height={28} preload className="theme-light-only h-7 w-auto" />
      </a>
      <nav aria-label={t('pageSections')}>{content.nav.map(item => <a key={item.href} href={item.href} className="press focus-visible:outline-lime">{item.label}</a>)}</nav>
      <div className={styles.headerEnd}>
        <div className="[&_[role=group]]:border-0 [&_[role=group]]:bg-transparent [&_[role=group]]:p-0 [&_[role=group]]:shadow-none [&_button]:border-0"><LanguageSwitch compact /></div>
        <ThemeSwitch compact />
        <a href={content.links.login} className="press min-h-12 min-w-12 justify-center text-sm text-muted">{content.login}</a>
        <a href={content.links.signup} className={buttonClass({ block: false, className: `px-4 ${styles.headerSignup}` })}>{content.signup}</a>
      </div>
    </div>
  </header>;
}

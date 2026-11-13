import Image from 'next/image';
import { LanguageSwitch } from '@/ui/language-switch';
import { ThemeSwitch } from '@/ui/theme-switch';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';
import { SiteMenu } from './site-menu';

export async function SiteHeader() {
  const t = await getT(messages);
  const content = getContent(t);
  return <header className="sticky top-0 z-50 border-b border-line bg-bg/80 pt-[var(--safe-top)] backdrop-blur-md"
    style={{ backgroundImage: 'linear-gradient(to bottom, var(--color-bg) var(--safe-top), transparent var(--safe-top))' }}>
    <div className="marketing-wrap flex flex-nowrap items-center justify-between h-16 gap-2">
      <div className="shrink-0">
        <Image src="/brand/logo-primary.png" alt={content.brand} width={132} height={38} priority className="theme-dark-only h-auto w-28 lg:w-33" />
        <Image src="/brand/logo-primary-light.png" alt={content.brand} width={132} height={38} priority className="theme-light-only h-auto w-28 lg:w-33" />
      </div>
      <nav className="hidden lg:flex min-w-0 items-center gap-1 text-sm">
        {content.nav.map(item => <a className="marketing-ghost min-h-12 whitespace-nowrap px-3" key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <div className="hidden lg:flex shrink-0 items-center gap-1 text-sm font-bold">
        <LanguageSwitch />
        <ThemeSwitch compact />
        <a className="marketing-ghost border border-line min-h-12 min-w-12 whitespace-nowrap px-3" href={content.links.login}>{content.login}</a>
      </div>
      <a data-signup className="marketing-ghost border border-line ms-auto min-h-12 shrink-0 whitespace-nowrap px-3 text-sm lg:ms-0 lg:px-4" href={content.links.signup}>{content.signup}</a>
      <SiteMenu openLabel={t('openMenu')} closeLabel={t('closeMenu')}>
        <div className="flex flex-col gap-1 text-sm font-bold">
          {content.nav.map(item => <a className="marketing-ghost min-h-12 justify-start px-3" key={item.href} href={item.href}>{item.label}</a>)}
          <a className="marketing-ghost border border-line min-h-12 justify-start px-3" href={content.links.login}>{content.login}</a>
          <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
            <LanguageSwitch /><ThemeSwitch compact />
          </div>
        </div>
      </SiteMenu>
    </div>
  </header>;
}

import { LanguageSwitch } from '@/ui/language-switch';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import Image from 'next/image';
import { ThemeSwitch } from '@/ui';
import { getContent } from '../content';

export async function SiteHeader() {
  const t = await getT(messages);
  const content = getContent(t);
  return <header className="marketing-wrap pt-6">
    <div className="glass grid min-h-17 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] px-4 py-2 lg:flex lg:flex-wrap lg:justify-between">
      <Image src="/brand/logo-primary.png" alt={content.brand} width={132} height={38} priority className="theme-dark-only h-auto w-28 sm:w-33" />
      <Image src="/brand/logo-primary-light.png" alt={content.brand} width={132} height={38} priority className="theme-light-only h-auto w-28 sm:w-33" />
      <nav className="col-span-2 row-start-3 hidden min-w-0 sm:flex w-full flex-wrap justify-center gap-1 text-sm lg:order-none lg:w-auto">
        {content.nav.map(item => <a className="marketing-ghost px-3" key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <a className="marketing-primary col-start-2 row-start-1 px-4 text-sm lg:hidden" href={content.links.signup}>{content.signup}</a>
      <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center justify-center gap-2 text-sm font-bold lg:justify-start">
        <div className="lg:hidden"><LanguageSwitch compact /></div><div className="hidden lg:block"><LanguageSwitch /></div>
        <ThemeSwitch compact /><a className="marketing-ghost px-3" href={content.links.demo}>{content.login}</a><a className="marketing-primary hidden px-4 lg:inline-flex" href={content.links.signup}>{content.signup}</a>
      </div>
    </div>
  </header>;
}

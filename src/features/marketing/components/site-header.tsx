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
    <div className="glass flex min-h-17 flex-wrap items-center justify-between gap-3 rounded-[22px] px-4 py-2">
      <Image src="/brand/logo-primary.png" alt={content.brand} width={132} height={38} priority className="theme-dark-only h-auto w-28 sm:w-33" />
      <Image src="/brand/logo-primary-light.png" alt={content.brand} width={132} height={38} priority className="theme-light-only h-auto w-28 sm:w-33" />
      <nav className="order-3 flex w-full flex-wrap justify-center gap-1 text-sm lg:order-none lg:w-auto">
        {content.nav.map(item => <a className="marketing-ghost px-3" key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold"><LanguageSwitch /><ThemeSwitch compact /><a className="marketing-ghost px-3" href={content.links.demo}>{content.login}</a><a className="marketing-primary px-4" href={content.links.signup}>{content.signup}</a></div>
    </div>
  </header>;
}

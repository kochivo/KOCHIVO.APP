import { getT } from '@/core/i18n/server';
import { Button } from '@/ui';
import { KoPlay } from '@/ui/icons';
import { messages } from '../messages';
import { getContent } from '../content';
import { Slogan } from './slogan';
import { HeroPhones } from './hero-phones';
import styles from './landing.module.css';

export async function Hero() {
  const content = getContent(await getT(messages));
  return <section id="hero" data-hero className={`marketing-wrap ${styles.hero}`}>
    <span data-slash aria-hidden="true" className={styles.slash} />
    <div className={`relative z-10 flex min-w-0 flex-col gap-6 ${styles.heroCopy}`}>
      <p className="marketing-eyebrow">{content.hero.eyebrow}</p>
      {await Slogan()}
      <p className="font-display text-2xl font-bold">{content.hero.arabic}</p>
      <p className="max-w-lg text-base leading-relaxed text-muted">{content.hero.description}</p>
      <div className="flex flex-wrap gap-3">
        <form action={content.links.login}><input type="hidden" name="tab" value="signup" /><Button type="submit" size="lg" className="ring-4 ring-bg-deep">{content.hero.signup}</Button></form>
        <a href="#day" className="glass inline-flex min-h-14 items-center gap-2 rounded-control px-5 font-bold"><KoPlay className="size-5" aria-hidden="true" />{content.hero.demo}</a>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">{content.hero.invite}<a href={content.links.login} className="inline-flex min-h-12 items-center text-lime underline underline-offset-4">{content.hero.inviteNote}</a></p>
    </div>
    {await HeroPhones()}
  </section>;
}

import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import { buttonClass } from '@/ui/button';
import { KoSend } from '@/ui/icons';
import { messages } from '../messages';
import { getContent } from '../content';
import { Slogan } from './slogan';
import styles from './landing.module.css';

export async function FinalCta() {
  const content = getContent(await getT(messages));
  return <section className={styles.final}>
    <span className={styles.slash} aria-hidden="true" /><span className={styles.slash} aria-hidden="true" />
    <div className={styles.wrap}>{await Slogan({ final: true })}<p>{content.final.note}</p>
      <div className={styles.cta}>
        <a href={content.links.signup} className={buttonClass({ size: 'lg', block: false })}>{content.final.action}<KoSend aria-hidden="true" className="dir-icon size-5" /></a>
        <Link href="/demo" prefetch={false} className={buttonClass({ size: 'lg', variant: 'secondary', block: false })}>{content.hero.tryDemo}</Link>
      </div>
    </div>
  </section>;
}

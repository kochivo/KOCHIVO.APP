import { getT } from '@/core/i18n/server';
import { Button } from '@/ui';
import { messages } from '../messages';
import { getContent } from '../content';
import styles from './landing.module.css';

export async function FinalCta() {
  const content = getContent(await getT(messages));
  return <section className="marketing-wrap marketing-section"><div className={`glass-strong flex flex-col items-center gap-6 rounded-card px-6 py-16 text-center ${styles.close}`}>
    <span data-slash aria-hidden="true" className={styles.slash} />
    <h2 className="marketing-heading">{content.final.title}</h2><p className="text-muted">{content.final.note}</p>
    <form action={content.links.login}><input type="hidden" name="tab" value="signup" /><Button type="submit" size="lg">{content.final.action}</Button></form>
  </div></section>;
}

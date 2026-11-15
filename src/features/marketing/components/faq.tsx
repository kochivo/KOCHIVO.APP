import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent, whatsappUrl } from '../content';
import styles from './landing.module.css';

export async function Faq() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section id="faq" className={`${styles.wrap} ${styles.section} ${styles.faqGrid}`}>
    <div><p className={styles.eyebrow}>{content.faqHeading.label}</p><h2>{content.faqHeading.title}</h2><a href={whatsappUrl} className={styles.faqContact}>{t('faqSub')}</a></div>
    <div className={styles.faq}>{content.faq.map((item, i) => <details key={item.q} open={i === 0}>
      <summary className="press focus-visible:outline-lime">{item.q}</summary><p>{item.a}</p>
    </details>)}</div>
  </section>;
}

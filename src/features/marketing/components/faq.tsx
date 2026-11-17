import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent, whatsappUrl } from '../content';
import styles from './landing.module.css';
import { ChevronDown } from 'lucide-react';

export async function Faq() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section id="faq" className={`${styles.wrap} ${styles.section} ${styles.faqGrid}`}>
    <div><p className={styles.eyebrow}>{content.faqHeading.label}</p><h2>{content.faqHeading.title}</h2><a href={whatsappUrl} className={styles.faqContact}>{t('faqSub')}</a></div>
    <div className={styles.faq}>{content.faq.map((item, i) => <details key={item.q} open={i === 0} className="group">
      <summary className="press focus-visible:outline-lime"><span className="flex-1">{item.q}</span><ChevronDown aria-hidden className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary><p>{item.a}</p>
    </details>)}</div>
  </section>;
}

import { Check, X } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';
import styles from './landing.module.css';

export async function WhyKochivo() {
  const t = await getT(messages);
  const { why } = getContent(t);
  return <section className={`${styles.wrap} ${styles.section}`}>
    <div className={styles.headingRow}><div><p className={styles.eyebrow}>{why.label}</p><h2>{why.title}</h2></div><p>{t('whySub')}</p></div>
    <div className={styles.comparison}>{[false, true].map(after => <article key={String(after)}>
      <h3>{after ? why.after : why.before}</h3>
      <ul>{(after ? why.afterList : why.beforeList).map(item => <li key={item}>
        {after ? <Check size={18} strokeWidth={1.7} aria-hidden="true" className="text-lime" /> : <X size={18} strokeWidth={1.7} aria-hidden="true" className="text-danger" />}{item}
      </li>)}</ul>
    </article>)}</div>
  </section>;
}

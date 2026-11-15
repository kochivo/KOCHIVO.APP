import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import styles from './landing.module.css';

export async function HowItWorks() {
  const t = await getT(messages);
  return <section id="day" className={`${styles.wrap} ${styles.section}`}>
    <p className={styles.eyebrow}>{t('stepsLabel')}</p><h2>{t('stepsTitle')}</h2>
    <div className={styles.steps}>{t('stepTitles').split('|').map((title, index) => <article className={styles.step} key={title}>
      <span>{index + 1}</span><h3>{title}</h3><p>{t('stepDescriptions').split('|')[index]}</p>
    </article>)}</div>
  </section>;
}

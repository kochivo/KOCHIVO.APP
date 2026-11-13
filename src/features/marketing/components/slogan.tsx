import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import styles from './landing.module.css';

export async function Slogan() {
  const t = await getT(messages);
  return <h1 aria-label={t('sloganLabel')} className={styles.slogan} dir="ltr" lang="en">
    <span>{t('sloganFirst')}</span>{' '}
    <span><span className="text-lime">{t('sloganMove')}</span>{' '}{t('sloganStarts')}</span>{' '}
    <span>{t('sloganLast')}</span>
  </h1>;
}

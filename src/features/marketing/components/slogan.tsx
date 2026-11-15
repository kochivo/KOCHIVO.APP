import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import styles from './landing.module.css';

export async function Slogan({ final = false }: { final?: boolean } = {}) {
  const t = await getT(messages);
  const Heading = final ? 'h2' : 'h1';
  const first = t('sloganFirst').split(' ');
  return <Heading id={final ? 'final-slogan' : undefined} data-slogan aria-label={t('sloganLabel')} className={`${styles.slogan} notranslate`} translate="no" dir="ltr" lang="en">
    <span>{first[0]}</span>{' '}<span>{first[1]}</span>{' '}<em data-word={t('sloganMove')}>{t('sloganMove')}</em><br />{' '}
    <span>{t('sloganStarts')}</span>{' '}<span>{t('sloganLast')}</span>
  </Heading>;
}

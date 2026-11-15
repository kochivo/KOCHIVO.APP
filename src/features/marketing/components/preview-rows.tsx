import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import styles from './preview.module.css';

export async function PreviewRows({ count = 4 }: { count?: number } = {}) {
  const t = await getT(messages);
  const names = t('wsNames').split('|'), initials = t('wsInitials').split('|');
  const details = t('wsDetails').split('|'), actions = t('wsActions').split('|');
  return <div className={styles.rows}>{names.slice(0, count).map((name, index) => <div className={styles.row} key={name}>
    <span className={`${styles.avatar} ${[styles.calm, styles.warn, '', styles.lime][index]}`}>{initials[index]}</span>
    <div><b>{name}</b><small>{details[index]}</small></div><span className={`${styles.chip} ${[styles.action, styles.warn, styles.calm, styles.lime][index]}`}>{actions[index]}</span>
  </div>)}</div>;
}

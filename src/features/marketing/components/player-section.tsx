import { Dumbbell, WifiOff, Smartphone } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { PlayerPreview } from './player-preview';
import styles from './landing.module.css';

const icons = [Dumbbell, WifiOff, Smartphone];

export async function PlayerSection() {
  const t = await getT(messages);
  return <section id="player" className={`${styles.wrap} ${styles.section}`}><div className={styles.split}>
    <div className={styles.phoneStage}><span className={styles.slash} aria-hidden="true" /><span className={styles.slash} aria-hidden="true" />{await PlayerPreview()}</div>
    <div><p className={styles.eyebrow}>{t('playerLabel')}</p><h2>{t('playerTitle')}</h2>
      <div className={styles.points}>{t('playerTitles').split('|').map((title, index) => {
        const Icon = icons[index] ?? Dumbbell;
        return <div key={title} className={styles.point}><span><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span><div><h3>{title}</h3><p>{t('playerDescriptions').split('|')[index]}</p></div></div>;
      })}</div>
    </div>
  </div></section>;
}

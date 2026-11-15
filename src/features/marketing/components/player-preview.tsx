import { Check, Play } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { KoTraining, KoFoods, KoCaptainChat, KoPlayers } from '@/ui/icons';
import { messages } from '../messages';
import { SetPreview } from './set-preview';
import styles from './preview.module.css';

const icons = [KoTraining, KoFoods, KoCaptainChat, KoPlayers];

export async function PlayerPreview({ interactive = true }: { interactive?: boolean } = {}) {
  const t = await getT(messages);
  return <div data-player-preview className={`${styles.phone} ${!interactive ? styles.compact : ''}`}><div className={styles.screen}>
    <div className={styles.phoneHeading}><div><small>{t('phoneDate')}</small><b>{t('phoneTitle')}</b></div><span>{t('offline')}</span></div>
    <div className={`${styles.exercise} glass`}><h5>{t('exercise')}</h5><div className={styles.video}><Play size={22} aria-hidden="true" /></div>
      {t('sets').split('|').map((set, index) => <div className={styles.set} key={set}><span>{index + 1}</span><b>{set}</b><Check size={15} aria-hidden="true" /></div>)}
    </div>
    {await SetPreview({ interactive })}
    <div className={`${styles.phoneNav} glass`}>{t('phoneNav').split('|').map((label, index) => {
      const Icon = icons[index] ?? KoTraining;
      return <span key={label}><Icon aria-hidden="true" className="size-4" />{label}</span>;
    })}</div>
  </div></div>;
}

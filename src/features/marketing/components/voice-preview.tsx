import { Play } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import styles from './preview.module.css';

export async function VoicePreview({ short = false }: { short?: boolean } = {}) {
  const t = await getT(messages);
  return <div className={styles.voice}><Play size={14} aria-hidden="true" /><span className={styles.wave} aria-hidden="true">
    {Array.from({ length: short ? 20 : 18 }, (_, index) => <i key={index} style={{ height: `${5 + (index * 7) % 12}px` }} />)}
  </span><bdi>{t(short ? 'shortVoiceTime' : 'voiceTime')}</bdi></div>;
}

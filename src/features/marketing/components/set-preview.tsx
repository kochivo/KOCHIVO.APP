import { getT } from '@/core/i18n/server';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import styles from './preview.module.css';

export async function SetPreview({ interactive = true, compact = false }: { interactive?: boolean; compact?: boolean } = {}) {
  const t = await getT(messages);
  return <div data-set-preview className={`${styles.setPreview} ${compact ? styles.compactSet : ''} glass-strong`}>
    <div className={styles.stepper}>
      {interactive ? <Button variant="secondary" aria-label={t('decreaseWeight')} data-adjust="-2.5">{t('minus')}</Button> : <span>{t('minus')}</span>}
      <div className={styles.weight} aria-live={interactive ? 'polite' : undefined}><strong data-preview-weight>{t('weight')}</strong><small>{t(compact ? 'phoneUnit' : 'phoneSet')}{!compact && <> <span data-preview-set>{t('initialSet')}</span></>}</small></div>
      {interactive ? <Button variant="secondary" aria-label={t('increaseWeight')} data-adjust="2.5">{t('plus')}</Button> : <span>{t('plus')}</span>}
    </div>
    {interactive ? <Button data-preview-done data-success={t('workoutLogged')} block>{t('done')}</Button> : <span className={styles.done}>{t('done')}</span>}
    {compact && interactive && <p className={styles.record} role="status" data-preview-record={t('record')} />}
  </div>;
}

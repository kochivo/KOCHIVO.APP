import Image from 'next/image';
import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import { buttonClass } from '@/ui/button';
import { messages } from '../messages';
import { WorkspacePreview } from './workspace-preview';
import styles from './landing.module.css';

export async function DemoSection() {
  const t = await getT(messages);
  return <section id="demo-sec" className={`${styles.wrap} ${styles.section}`}>
    <div className={styles.headingRow}><div><p className={styles.eyebrow}>{t('demoNav')}</p><h2>{t('demoTitle')}</h2></div><p>{t('demoSub')}</p></div>
    <div className={styles.demo}><div className={styles.shot}>
      {await WorkspacePreview()}
      <div className={styles.coach}><div><Image src="/brand/icon.png" width={32} height={32} alt="" /><small>{t('demoGuide')}</small><span className={styles.guideCounter}>{t('demoStep')}</span></div><div className={styles.guideProgress}><i /></div><h4>{t('wsNeeds')}</h4><p>{t('demoGuideDetail')}</p></div>
    </div><div className={styles.demoCta}><p>{t('demoDetail')}</p><Link href="/demo" prefetch={false} className={buttonClass({ size: 'lg', block: false })}>{t('demoAction')}<span aria-hidden="true">{t('ctaArrow')}</span></Link></div></div>
  </section>;
}

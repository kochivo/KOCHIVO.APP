import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import { buttonClass } from '@/ui/button';
import { ClipboardCheck, Zap } from 'lucide-react';
import { messages } from '../messages';
import { getContent } from '../content';
import { Slogan } from './slogan';
import { WorkspacePreview } from './workspace-preview';
import { PlayerPreview } from './player-preview';
import styles from './landing.module.css';

export async function Hero() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section id="hero" data-hero className={styles.hero}>
    <div className={styles.hv} aria-hidden="true"><span className={styles.halo} /><span className={styles.grid} />
      <span className={styles.barOne} /><span className={styles.streak} /><span className={styles.streak} /><span className={styles.streak} /><span className={styles.barTwo} /><span className={styles.barThree} />
    </div>
    <div className={styles.wrap}>
      <div className={styles.heroTop}>
        <p className={styles.pill}><i />{content.hero.eyebrow}</p>
        {await Slogan()}
        <p className={styles.tagline}>{content.hero.arabic}</p>
        <p className={styles.lead}>{content.hero.description}</p>
        <div className={styles.cta}>
          <a href={content.links.signup} className={buttonClass({ size: 'lg', block: false })}>{content.hero.signup}<span aria-hidden="true">{t('ctaArrow')}</span></a>
          <Link href="/demo" prefetch={false} className={buttonClass({ variant: 'secondary', size: 'lg', block: false, className: 'font-extrabold' })}>{content.hero.tryDemo}</Link>
        </div>
        <p className={styles.fine}>{content.hero.invite}{' '}<a href={content.links.login}>{content.hero.inviteNote}</a></p>
      </div>
      <div id="inside" className={styles.stage}>
        <div className={styles.window}><div className={styles.windowBar}><i /><i /><i /><span>{t('wsUrl')}</span></div>{await WorkspacePreview()}</div>
        <div className={styles.stagePhone}>{await PlayerPreview({ interactive: false })}</div>
        <div className={`${styles.toast} ${styles.toastFirst}`}><span className="rounded-control bg-calm/10 p-3 text-calm"><ClipboardCheck size={20} aria-hidden="true" /></span><div><b>{t('toastReview')}</b><small>{t('toastReviewDetail')}</small></div></div>
        <div className={`${styles.toast} ${styles.toastSecond}`}><span className="rounded-control bg-lime-soft p-3 text-lime"><Zap size={20} aria-hidden="true" /></span><div><b>{t('toastRecord')}</b><small>{t('toastRecordDetail')}</small></div></div>
      </div>
      <div className={styles.facts}>
        <div><strong dir="ltr">{t('exerciseCount')}</strong><span>{t('animatedExercises')}</span></div>
        <div><strong>{t('egyptianFood')}</strong><span>{t('foodDetail')}</span></div>
        <div><strong>{t('offline')}</strong><span>{t('offlineDetail')}</span></div>
        <div><strong>{content.plans[0].displayPrice} <small>{t('pounds')}</small></strong><span>{t('freePlayer')}</span></div>
      </div>
    </div>
  </section>;
}

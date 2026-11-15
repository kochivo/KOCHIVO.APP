import Image from 'next/image';
import { Search, Mic } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { KoHome, KoFollowup, KoCaptainChat, KoPlayers, KoTraining, KoFoods, KoForms, KoBilling } from '@/ui/icons';
import { messages } from '../messages';
import { PreviewRows } from './preview-rows';
import { VoicePreview } from './voice-preview';
import styles from './preview.module.css';

const icons = [KoHome, KoFollowup, KoCaptainChat, KoPlayers, KoTraining, KoFoods, KoForms, KoBilling];

export async function WorkspacePreview() {
  const t = await getT(messages);
  return <div className={styles.fit} data-fit><div className={styles.workspace} data-workspace>
    <div className={styles.orbs} aria-hidden="true" />
    <aside className={`${styles.side} glass`}>
      <Image src="/brand/logo-primary.png" alt="" width={98} height={28} className="theme-dark-only" />
      <Image src="/brand/logo-primary-light.png" alt="" width={98} height={28} className="theme-light-only" />
      {t('wsNav').split('|').map((label, index) => {
        const Icon = icons[index] ?? KoHome;
        return <span key={label} className={index === 0 ? styles.selected : ''}><Icon aria-hidden="true" className="size-5" />{label}{(index === 1 || index === 2) && <b>{t('previewCounts').split('|')[index - 1]}</b>}</span>;
      })}
    </aside>
    <div className={styles.main}>
      <div className={`${styles.toolbar} glass`}><h4>{t('wsGreeting')}<small>{t('wsDate')}</small></h4><span className={styles.search}><Search size={16} aria-hidden="true" />{t('wsSearch')}</span><span className={styles.add}>{t('wsAdd')}</span></div>
      <div className={`${styles.summary} glass-strong`}>
        <svg viewBox="0 0 96 96" width="92" height="92" aria-hidden="true" className={styles.ring}><circle cx="48" cy="48" r="40" /><circle cx="48" cy="48" r="40" strokeDasharray="195 251" transform="rotate(-90 48 48)" /><text x="48" y="47">{t('previewRing')}</text><text x="48" y="64">{t('wsRing')}</text></svg>
        <div><b>{t('wsSummary')}</b><small>{t('wsDetail')}</small></div>
        <div className={styles.kpis}>{t('wsKpis').split('|').map((label, index) => <div key={label}><span>{label}</span><strong>{t('previewKpis').split('|')[index]}</strong></div>)}</div>
      </div>
      <div className={styles.columns}>
        <div className={`${styles.panel} glass`}><h5>{t('wsNeeds')}<em>{t('previewCounts').split('|')[0]}</em></h5>{await PreviewRows()}</div>
        <div className={`${styles.panel} glass`}><h5>{t('wsNames').split('|')[0]}<em>{t('wsAgo')}</em></h5>
          <div className={styles.message}>{t('wsChat')}</div>{await VoicePreview()}<div className={styles.message}>{t('wsReply')}</div><div className={styles.compose}>{t('wsCompose')}<Mic size={17} aria-hidden="true" /></div>
        </div>
      </div>
    </div>
  </div></div>;
}

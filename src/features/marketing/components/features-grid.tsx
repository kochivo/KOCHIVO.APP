import { getT } from '@/core/i18n/server';
import { ArrowDownUp, Copy, MessageCircle } from 'lucide-react';
import { messages } from '../messages';
import { PreviewRows } from './preview-rows';
import { SetPreview } from './set-preview';
import { VoicePreview } from './voice-preview';
import { PlayerSection } from './player-section';
import { DemoSection } from './demo-section';
import styles from './landing.module.css';
import preview from './preview.module.css';

export async function FeaturesGrid() {
  const t = await getT(messages);
  const titles = t('tileTitles').split('|'), descriptions = t('tileDescriptions').split('|');
  const screens = [
    await PreviewRows({ count: 3 }),
    await SetPreview({ compact: true }),
    <div className="flex flex-col gap-2" key="chat"><div className={preview.message}>{t('question')}</div>{await VoicePreview({ short: true })}<div className={preview.message}>{t('slower')}</div></div>,
    <div className={styles.swap} key="swap"><div>{t('rice')}<b>{t('riceAmount')}</b></div><span><ArrowDownUp size={16} aria-hidden="true" /></span><div>{t('pasta')}<b>{t('pastaAmount')}</b></div></div>,
    <div className={styles.invite} key="invite"><span className={`${preview.avatar} ${preview.lime}`}>{t('wsInitials').split('|')[3]}</span><div><b>{t('inviteReady')}</b><small>{t('invitePackage')}</small></div><code dir="ltr">{t('inviteUrl')}<Copy size={15} aria-hidden="true" /></code><span><MessageCircle size={16} aria-hidden="true" />{t('sendWhatsapp')}</span></div>,
  ];
  return <>
    <section id="features" className={`${styles.wrap} ${styles.section}`}>
      <div className={styles.headingRow}><div><p className={styles.eyebrow}>{t('productLabel')}</p><h2>{t('productTitle')}</h2></div><p>{t('productSub')}</p></div>
      <div className={styles.bento}>
        {screens.map((screen, index) => <article className={styles.tile} key={titles[index]}><div><h3>{titles[index]}</h3><p>{descriptions[index]}</p></div>{screen}</article>)}
        <article className={styles.tile}><div className={styles.money}>
          <div><h3>{titles[5]}</h3><p>{descriptions[5]}</p><strong>{t('collectedAmount')} <small>{t('collected')}</small></strong><div className={styles.meter}><i /></div><div className={styles.legend}><span>{t('collectedLabel')}</span><span>{t('overdueLabel')}</span></div></div>
          <div className={styles.moneyRows}>{t('moneyNames').split('|').map((name, index) => <div key={name}><span className={preview.avatar}>{name.split(' ').map(part => part[0]).join(' ')}</span><div>{name}<small>{t('moneyDetails').split('|')[index]}</small></div>{index === 2 ? <span className={styles.renewChip}>{t('renewTap')}</span> : <b>{t('moneyAmounts').split('|')[index]}</b>}</div>)}</div>
        </div></article>
      </div>
    </section>
    {await PlayerSection()}
    {await DemoSection()}
  </>;
}

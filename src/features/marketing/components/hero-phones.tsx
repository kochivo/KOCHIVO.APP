import { Check, Play } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';
import styles from './landing.module.css';

export async function HeroPhones() {
  const { preview: p, sample: s, feed } = getContent(await getT(messages));
  return <div data-devices className={styles.devices}>
    <div className={`${styles.phone} ${styles.back}`}><div className={styles.screen}>
      <span aria-hidden="true" className={styles.notch} />
      <p className="text-xs text-muted">{s.needsYou}</p>
      {s.rows.map((row, i) => <div key={row} className="glass flex items-center justify-between gap-inline rounded-control p-3 text-xs"><span>{row}</span><span className="text-lime">{s.actions[i]}</span></div>)}
      <p className="text-xs text-muted">{s.finished}</p><strong dir="ltr" className="glass-strong rounded-card p-3 text-3xl">{s.count}</strong>
    </div></div>
    <div className={styles.phone}><div className={styles.screen}>
      <span aria-hidden="true" className={styles.notch} />
      <p className="text-xs text-muted">{p.day}</p><strong>{p.exercise}</strong>
      <div>{s.sets.map(set => <div key={set} className="flex justify-between border-b border-line py-inline text-sm"><bdi>{set}</bdi><Check size={16} aria-hidden="true" className="text-lime" /></div>)}</div>
      <div className="glass-strong flex items-center justify-between rounded-card p-3"><span aria-hidden="true" className="text-2xl">{p.minus}</span><strong data-weight data-from={s.initial} data-to={p.weight} className="text-5xl">{p.weight}</strong><span aria-hidden="true" className="text-2xl text-lime">{p.plus}</span></div>
      <p className="text-xs text-lime">{p.pr}</p><span className="mt-auto rounded-control bg-lime p-3 text-center text-sm font-bold text-on-lime">{p.done}</span>
    </div></div>
    <div data-toast className={`glass-strong ${styles.toast}`}><Check size={20} aria-hidden="true" className="shrink-0 text-lime" /><p>{feed[1].t}<small className="block text-muted">{s.workout}</small></p></div>
    <div data-toast className={`glass-strong ${styles.toast} ${styles.toastSecond}`}><Play size={20} aria-hidden="true" className="shrink-0 text-lime" /><p>{s.notification}<small className="block text-muted">{s.detail}</small></p></div>
    <p className={styles.sample}>{s.label}</p>
  </div>;
}

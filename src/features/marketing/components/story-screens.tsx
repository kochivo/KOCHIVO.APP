import { Check, Circle, Play } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';
import styles from './landing.module.css';

export async function StoryScreens() {
  const { story: s, feed } = getContent(await getT(messages));
  return <div className={styles.phone}>{s.titles.map((title, i) => <div key={title} data-screen={i} hidden={i !== 0} className="h-full">
    <div className={styles.screen}>
      <span aria-hidden="true" className={styles.notch} /><time dir="ltr" className="text-start text-xs text-muted">{feed[i]?.at}</time><h4 className="font-bold">{title}</h4>
      {i === 0 && <><ul className="space-y-2">{s.players.map((name, n) => <li key={name} className="glass flex items-center gap-3 rounded-control p-3 text-sm">{n === 0 ? <Check size={16} aria-hidden="true" className="text-lime" /> : <Circle size={16} aria-hidden="true" className="text-muted" />}{name}</li>)}</ul><span className="mt-auto rounded-control bg-lime p-3 text-center text-sm font-bold text-on-lime">{s.assign}</span></>}
      {i === 1 && <><ul className="space-y-2">{s.exercises.map((name, n) => <li key={name} className="flex items-center justify-between gap-2 border-b border-line py-3 text-sm"><span>{name}</span><span className="flex items-center gap-1 text-lime"><bdi>{s.sets[n]}</bdi><Check size={14} aria-hidden="true" /></span></li>)}</ul><span className="rounded-control bg-lime-soft p-3 text-sm text-lime">{s.logged}</span></>}
      {i === 2 && <><div className="glass-strong grid flex-1 place-items-center rounded-card"><Play size={42} aria-hidden="true" className="text-lime" /></div><p className="text-xs text-muted">{s.video}</p></>}
      {i === 3 && <><p className="glass rounded-card p-3 text-sm leading-relaxed">{s.question}</p><p className="ms-4 rounded-card border border-lime/20 bg-lime-soft p-3 text-sm leading-relaxed">{s.reply}</p><p className="text-xs text-muted">{s.sent}</p></>}
    </div>
  </div>)}</div>;
}

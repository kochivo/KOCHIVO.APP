import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import type { PaneProps } from './types';

export function Assessment({ state, act }: PaneProps) {
  const t = useT(guidedMessages), [reply, setReply] = useState(t('reply'));
  return <div className="grid gap-card-gap min-[1200px]:grid-cols-2"><GlassCard className="grid content-start gap-stack p-card">
    <div className="grid grid-cols-3 gap-inline">{t('photos').split('|').map(label => <div key={label} className="recessed grid aspect-[3/4] place-items-center rounded-control p-stack"><UserRound className="size-12 text-muted" aria-hidden /><span className="text-xs text-muted">{label}</span></div>)}</div>
    <div className="overflow-x-auto"><table className="w-full text-row"><thead><tr>{t('measurements').split('|').map(label => <th key={label} className="p-stack text-start text-micro font-normal text-muted">{label}</th>)}</tr></thead><tbody>
      {[[68.4, 67.2, -1.2], [74, 72, -2], [98, 97, -1], [29, 29, 0]].map((row, i) => <tr key={i} className="border-t border-line"><th className="p-stack text-start font-normal">{t('measureNames').split('|')[i]}</th>{row.map((value, j) => <td key={j} className={`p-stack tabular-nums ${j === 2 ? 'text-lime' : ''}`}><bdi>{value}</bdi></td>)}</tr>)}
    </tbody></table></div>
  </GlassCard><GlassCard className="grid content-start gap-stack p-card"><h3>{t('answers')}</h3>{t('answerLabels').split('|').map((label, i) => <DemoRow key={label} title={t('answerValues').split('|')[i]} detail={label} />)}
    {state.approved ? <p className="rounded-control bg-lime-soft p-stack text-sm">{t('approvalDone')}</p> : <><label className="grid gap-stack text-sm">{t('message')}<textarea className="recessed min-h-24 w-full rounded-control border border-line p-stack" value={reply} onChange={e => setReply(e.target.value)} /></label><Button data-demo-target="approve" onClick={() => act('approve', reply)}>{t('approve')}</Button></>}
  </GlassCard></div>;
}

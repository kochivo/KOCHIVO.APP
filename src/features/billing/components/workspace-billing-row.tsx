'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { reminderText, waLink } from '../renew';
import { setPlayerFrozen } from '../data/pt-actions';
import { billingState } from '../workspace';
import { messages } from '../workspace/messages';
import { messages as legacyMessages } from '../messages';
import type { BillingPlayer, Package } from '../types';

const Detail = dynamic(() => import('./workspace-player-detail').then(m => m.WorkspacePlayerDetail));
export function WorkspaceBillingRow({ player, today, packages }: { player: BillingPlayer; today: string; packages: Package[] }) {
  const t = useT(messages), legacy = useT(legacyMessages), locale = useLocale(), router = useRouter();
  const [detail, setDetail] = useState<'history' | 'renew' | 'collect' | 'activate' | null>(null);
  const [frozenAt, setFrozenAt] = useState(player.frozenAt);
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const state = billingState({ ...player, frozenAt }, today);
  const reminder = waLink(player.phone, reminderText(player.fullName, player.accessUntil, locale));
  async function action() {
    if (state.action === 'unfreeze' && player.linkId) {
      if (lock.current) return;
      lock.current = true; setPending(true); setError(''); setFrozenAt(null);
      try {
        const result = await setPlayerFrozen(player.linkId, false);
        if (result.error) throw new Error(result.error);
        router.refresh();
      } catch (error) { setFrozenAt(player.frozenAt); setError(error instanceof Error ? error.message : t('failure')); }
      finally { setPending(false); lock.current = false; }
    } else setDetail(state.action === 'renew' ? 'renew' : state.action === 'activate' ? 'activate'
      : state.action === 'record' ? player.due > 0 ? 'collect' : 'renew' : 'history');
  }
  return <li className="border-t border-line-soft">
    <div className="grid min-h-16 grid-cols-2 items-center gap-3 px-4 py-3 min-[1001px]:grid-cols-[1.4fr_1fr_1fr_1fr_150px]"
      onClick={() => setDetail('history')}>
      <button type="button" className="flex min-h-12 min-w-0 items-center gap-2.5 text-start" onClick={event => { event.stopPropagation(); setDetail('history'); }}>
        <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-full border border-line bg-surface-raised text-xs">{player.fullName.slice(0, 1)}</span>
        <span className="break-words text-sm">{player.fullName}</span></button>
      <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] ${state.tone}`}>{t(state.label, { n: state.days })}</span></div>
      <div className="text-[13px] text-muted"><span className="me-1 text-xs text-faint min-[1001px]:hidden">{t('until')}</span><time dateTime={player.accessUntil}>{formatDateAr(player.accessUntil, { day: 'numeric', month: 'long' }, locale)}</time></div>
      <div className="font-display text-[13px] tabular-nums"><span className="me-1 text-xs text-faint min-[1001px]:hidden">{t('last')}</span>{player.lastPayment?.amount_egp == null ? legacy(player.lastPayment ? 'noAmount' : 'noPayments') : t('money', { amount: formatNumber(player.lastPayment.amount_egp, locale) })}</div>
      {state.action === 'remind' && reminder ? <a href={reminder} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}
        className="col-span-2 inline-flex min-h-12 items-center justify-center rounded-full border border-line px-3 text-[12.5px] min-[1001px]:col-span-1">{t('remind')}</a>
        : <button type="button" disabled={pending} onClick={event => { event.stopPropagation(); void action(); }}
          className="col-span-2 min-h-12 rounded-full border border-line px-3 text-[12.5px] disabled:opacity-40 min-[1001px]:col-span-1">{t(state.action)}</button>}
    </div>
    {error && <p role="alert" className="px-4 pb-3 text-sm text-danger">{error}</p>}
    {detail && <Detail player={{ ...player, frozenAt }} today={today} packages={packages} initialAction={detail} onClose={() => setDetail(null)} />}
  </li>;
}

'use client';
import { useTimezone } from '@/core/timezone/client';

import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useT } from '@/core/i18n';
import { localDb, useLiveQuery } from '@/core/offline';
import { localDate } from '@/lib/dates';
import { groupByTiming } from '../model';
import { messages } from '../messages';
import { refreshSupplements } from '../data/refresh';
import { toggleTodaySupplement } from '../data/log-supplement';
import { useSupplementPlayer } from '../hooks/use-supplement-player';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function PlayerSupplements() {
  const timezone = useTimezone();
  const t = useT(messages);
  const v6 = captainWorkspaceEnabled();
  const [error, setError] = useState(false);
  const [day, setDay] = useState(() => localDate(new Date(), timezone));
  const [pending, setPending] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const onError = useCallback(() => setError(true), []);
  const playerId = useSupplementPlayer(onError);
  const read = useCallback(async () => ({ playerId,
    supplements: playerId ? await localDb().supplements.where('player_id').equals(playerId).toArray() : [],
    logs: await localDb().supplement_logs.toArray() }), [playerId]);
  const data = useLiveQuery(read, onError, retryKey);
  const refresh = useCallback(() => {
    void refreshSupplements().then(() => { setError(false); setDay(localDate(new Date(), timezone)); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [timezone]);
  useEffect(() => {
    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); };
  }, [refresh, playerId]);
  useEffect(() => {
    const update = () => setDay(localDate(new Date(), timezone));
    const timer = window.setInterval(update, 30000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [timezone]);
  const retry = () => { setRetryKey(value => value + 1); refresh(); };
  if (!data || data.playerId !== playerId || !playerId || (loading && !data.supplements.length)) return error
    ? <div role="alert"><p>{t('error')}</p><button className="min-h-12 px-4" onClick={retry}>{t('retry')}</button></div>
    : <p role="status">{t('loading')}</p>;
  if (!data.supplements.length && !error) return v6 ? <section className="glass rounded-card border border-line-soft p-5">
    <h2 className="font-display text-[19px] font-semibold">{t('today')}</h2><p className="mt-3 text-sm text-faint">{t('empty')}</p></section> : null;
  const toggle = async (id: string, now: number) => {
    setPending(current => [...current, id]);
    setDay(localDate(new Date(now), timezone));
    try { await toggleTodaySupplement(localDb(), id, now, timezone); }
    catch { setError(true); }
    finally { setPending(current => current.filter(value => value !== id)); }
  };
  if (v6) return <section className="glass overflow-hidden rounded-card border border-line-soft">
    <h2 className="px-5 pt-[18px] pb-1 font-display text-[19px] font-semibold">{t('today')}</h2>
    {error && <div role="alert" className="px-5"><p>{t('error')}</p><button className="min-h-12 text-lime" onClick={retry}>{t('retry')}</button></div>}
    {groupByTiming(data.supplements).flatMap(group => group.items.map(item => {
      const taken = data.logs.some(log => log.supplement_id === item.id && log.log_date === day && log.taken_at && !log.deleted_at);
      return <button key={item.id} aria-label={t('tick', { name: item.name })} aria-pressed={taken} disabled={pending.includes(item.id)}
        onClick={() => void toggle(item.id, Date.now())} className="flex min-h-16 w-full items-center gap-3 border-t border-line-soft px-5 py-3 text-start">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${taken ? 'border-lime bg-lime text-on-lime' : 'border-line'}`}>
          {taken && <Check aria-hidden className="size-5" />}</span>
        <span className="min-w-0"><span className="block">{item.name}</span><span className="mt-1 block text-[11.5px] text-faint">{item.dose} · {t(group.timing)}</span>
          {item.notes && <span className="block text-xs text-muted">{item.notes}</span>}</span>
      </button>;
    }))}
  </section>;
  return <section className="glass space-y-4 rounded-card p-5">
    <h2 className="text-xl font-bold">{t('today')}</h2>
    {error && <div role="alert"><p>{t('error')}</p><button className="min-h-12 px-4" onClick={retry}>{t('retry')}</button></div>}
    {groupByTiming(data.supplements).map(group => <div key={group.timing} className="space-y-2">
      <h3 className="text-sm text-muted">{t(group.timing)}</h3>
      {group.items.map(item => {
        const taken = data.logs.some(log => log.supplement_id === item.id && log.log_date === day && log.taken_at && !log.deleted_at);
        return <button key={item.id} aria-label={t('tick', { name: item.name })} aria-pressed={taken} disabled={pending.includes(item.id)}
          onClick={() => void toggle(item.id, Date.now())} className="glass-strong flex min-h-14 w-full items-center gap-4 rounded-control p-4 text-start">
          <span className={`grid size-14 shrink-0 place-items-center rounded-control ${taken ? 'bg-lime text-on-lime' : 'glass'}`}><Check aria-hidden className={taken ? 'size-6' : 'size-6 opacity-20'} /></span>
          <span><span className="block font-bold">{item.name}</span><span className="block text-sm text-muted">{item.dose}</span>{item.notes && <span className="block text-sm">{item.notes}</span>}</span>
        </button>;
      })}
    </div>)}
  </section>;
}

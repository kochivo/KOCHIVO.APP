'use client';
import { useTimezone } from '@/core/timezone/client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { useToast } from '@/ui/toast';
import { resolveJoinRequest } from '../data/join-requests';
import { messages } from '../messages';
import { BillingManagerLoader } from '@/features/billing';
import { localDate } from '@/lib/dates';
import { WorkspaceJoinCard } from './workspace-join-card';
import type { JoinRequestRow } from './workspace-join-card';

export function JoinRequestsList({ rows, onResolved, workspace = false, phone = false, now = 0 }: {
  rows: JoinRequestRow[]; onResolved?: (id: string) => void; workspace?: boolean; phone?: boolean; now?: number;
}) {
  const timezone = useTimezone();
  const t = useT(messages), router = useRouter();
  const toast = useToast();
  const [hidden, setHidden] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const busy = useRef(new Set<string>());
  const visible = rows.filter(row => !hidden.includes(row.id));
  async function resolve(id: string, status: 'accepted' | 'declined') {
    if (busy.current.has(id)) return;
    busy.current.add(id); setError(''); setHidden(previous => [...previous, id]);
    try {
      const result = await resolveJoinRequest(id, status);
      if (result.error) throw new Error(result.error);
      if (status === 'accepted' && result.playerId) setSelected({ id: result.playerId, name: rows.find(row => row.id === id)?.full_name ?? '' });
      if (workspace && status === 'accepted') toast.success(t('joinAccepted', { name: rows.find(row => row.id === id)?.full_name ?? '' }));
      onResolved?.(id);
      router.refresh();
    } catch {
      setHidden(previous => previous.filter(value => value !== id)); setError(t('failure'));
    } finally { busy.current.delete(id); }
  }
  return <div className="space-y-stack">
    {selected && <BillingManagerLoader playerId={selected.id} name={selected.name} today={localDate(new Date(), timezone)} autoActivate />}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {visible.length ? <ul className={workspace ? `glass overflow-hidden rounded-card${phone ? ' max-md:space-y-card-gap max-md:border-0 max-md:bg-none max-md:shadow-none' : ''}` : 'space-y-stack'}>{visible.map(row => workspace
      ? <WorkspaceJoinCard key={row.id} row={row} now={now} phone={phone} onResolve={(id, status) => void resolve(id, status)} />
      : <li key={row.id} className="flex flex-wrap items-center justify-between gap-stack">
      <span>{row.full_name}</span><div className="flex gap-inline">
        <Button variant="secondary" onClick={() => void resolve(row.id, 'accepted')}>{t('accept')}</Button>
        <Button variant="secondary" className="border border-danger/40 text-danger" onClick={() => void resolve(row.id, 'declined')}>{t('decline')}</Button>
      </div>
    </li>)}</ul> : <p className={workspace ? 'glass rounded-card p-card text-sm text-muted' : 'text-sm text-muted'}>{t('empty')}</p>}
  </div>;
}

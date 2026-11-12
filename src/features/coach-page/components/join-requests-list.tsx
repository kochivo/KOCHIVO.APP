'use client';
import { useTimezone } from '@/core/timezone/client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { resolveJoinRequest } from '../data/join-requests';
import { messages } from '../messages';
import { BillingManagerLoader } from '@/features/billing';
import { localDate } from '@/lib/dates';

export function JoinRequestsList({ rows, onResolved }: { rows: { id: string; full_name: string }[]; onResolved?: (id: string) => void }) {
  const timezone = useTimezone();
  const t = useT(messages), router = useRouter();
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
      onResolved?.(id);
      router.refresh();
    } catch {
      setHidden(previous => previous.filter(value => value !== id)); setError(t('failure'));
    } finally { busy.current.delete(id); }
  }
  return <div className="space-y-3">
    {selected && <BillingManagerLoader playerId={selected.id} name={selected.name} today={localDate(new Date(), timezone)} autoActivate />}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {visible.length ? <ul className="space-y-3">{visible.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3">
      <span>{row.full_name}</span><div className="flex gap-2">
        <Button variant="secondary" onClick={() => void resolve(row.id, 'accepted')}>{t('accept')}</Button>
        <Button variant="ghost" onClick={() => void resolve(row.id, 'declined')}>{t('decline')}</Button>
      </div>
    </li>)}</ul> : <p className="text-sm text-muted">{t('empty')}</p>}
  </div>;
}

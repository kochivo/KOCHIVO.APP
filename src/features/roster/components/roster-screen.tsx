'use client';

import { use, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { Button, Chip, EmptyState, ErrorState, GlassCard, LoadingState, TextField } from '@/ui';
import { playerStatus } from '../status';
import type { RosterResult } from '../types';
import { RosterRow } from './roster-row';
import { InviteSheet } from './invite-sheet';
import { RadarCard } from './radar-card';
import { useDemoExpiry } from '@/features/demo';

export function RosterScreen({ data, today }: { data: Promise<[RosterResult, string]>; today: string }) {
  const demo = useDemoExpiry();
  const [result, captainFirstName] = use(data);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const players = result.players ?? [];
  const statuses = players.map((player) => ({ player, status: playerStatus({ ...player, today }) }));
  const visible = statuses.filter(({ player, status }) => (filter === 'all' || status === filter)
    && player.fullName.includes(search.trim()));
  const counts = [
    { label: 'نشط', count: statuses.filter(({ status }) => status === 'active').length, color: 'text-lime' },
    { label: 'متأخر', count: statuses.filter(({ status }) => status === 'late').length, color: 'text-warn' },
    { label: 'هيخلص قريب', count: statuses.filter(({ status }) => status === 'ending').length, color: 'text-danger' },
    { label: 'مهام مستنياك', count: players.reduce((sum, player) => sum + player.openTasks, 0), color: 'text-ink' },
  ];
  const inviteButton = <Button onClick={() => setInviteOpen(true)} className="min-h-12"><Plus aria-hidden className="size-5" />{demo ? 'الدعوات مقفولة في الديمو' : 'لاعب جديد'}</Button>;
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-xs text-muted">{players.length} لاعب</p><h1 className="text-3xl font-extrabold">اللاعبين</h1></div>
        {(players.length > 0 || result.error) && inviteButton}
      </header>
      <RadarCard today={today} />
      {pending ? <LoadingState /> : result.error ? <ErrorState message={result.error} retryLabel="جرّب تاني" onRetry={() => startTransition(() => router.refresh())} /> : players.length === 0 ? (
        <EmptyState icon={Users} title={demo ? 'لسه مفيش بيانات تجريبية' : 'لسه مفيش لاعبين. ابعت أول دعوة.'} body={demo ? 'الدعوات مقفولة في الديمو' : 'ابدأ بلينك دعوة للاعبك'} action={{ label: demo ? 'الدعوات مقفولة في الديمو' : 'لاعب جديد', onClick: () => setInviteOpen(true) }} />
      ) : <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {counts.map(({ label, count, color }) => <GlassCard key={label} level="strong" className="space-y-2 p-5"><p className="text-sm text-muted">{label}</p><p className={`font-display text-4xl font-extrabold ${color}`}>{count}</p></GlassCard>)}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div aria-label="فلتر اللاعبين" className="flex flex-wrap gap-2">
            {([{ value: 'all', label: 'الكل' }, { value: 'late', label: 'متأخر' }, { value: 'ending', label: 'هيخلص قريب' }]).map(({ value, label }) => <Chip key={value} pressed={filter === value} onClick={() => setFilter(value)}>{label}</Chip>)}
          </div>
          <div className="w-full sm:max-w-xs"><TextField label="دوّر على لاعب" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم اللاعب" /></div>
        </div>
        {visible.length === 0 ? <EmptyState icon={Users} title={search.trim() ? 'مفيش لاعب بالاسم ده' : 'مفيش لاعبين بالفلتر ده'} body="جرّب اسم أو فلتر تاني" /> : (
          <div role="table" aria-label="اللاعبين" className="space-y-3 lg:glass-strong lg:overflow-hidden lg:rounded-card lg:space-y-0">
            <div role="rowgroup" className="hidden lg:block"><div role="row" className="grid grid-cols-[1.3fr_1fr_1fr_1.2fr_1fr_3rem] gap-4 p-4 text-xs text-muted">
              {['اللاعب', 'الحالة', 'آخر تسجيل', 'البرنامج', 'الاشتراك لحد', 'أرشفة'].map((label) => <span role="columnheader" key={label}>{label}</span>)}
            </div></div>
            <div role="rowgroup" className="space-y-3 lg:space-y-0">{visible.map(({ player }) => <RosterRow key={player.playerId} player={player} today={today} />)}</div>
          </div>
        )}
      </>}
      {inviteOpen && <InviteSheet captainFirstName={captainFirstName} onClose={() => setInviteOpen(false)} />}
    </section>
  );
}

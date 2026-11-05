'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { messages as ptMessages } from '../packages/messages';

import { useState } from 'react';
import { Package as PackageIcon, Plus, X } from 'lucide-react';
import { Button, EmptyState, GlassCard, Segmented, Stepper, TextField } from '@/ui';
import { archivePackage, createPackage } from '../data/finance-actions';
import type { Package } from '../types';

export function PackagesCard({ packages: initial, onChange }: { packages: Package[]; onChange: (packages: Package[]) => void }) {
  const t = useT(messages);
  const pt = useT(ptMessages);
  const locale = useLocale();
  const [packages, setPackages] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('30');
  const [kind, setKind] = useState<'days' | 'sessions'>('days');
  const [sessions, setSessions] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const values = { name: name.trim(), price: Number(price), days: Number(days), kind, sessions: kind === 'sessions' ? sessions : null };
  const valid = values.name.length > 0 && values.name.length <= 60 && price.trim() !== ''
    && Number.isInteger(values.price) && values.price >= 0 && values.price <= 100000
    && Number.isInteger(values.days) && values.days >= 1 && values.days <= 365;
  function update(next: Package[]) { setPackages(next); onChange(next); }

  async function add() {
    if (!valid || busy) return;
    setBusy(true); setError('');
    try {
      const result = await createPackage(values);
      if (result.error !== undefined) setError(result.error);
      else { update([...packages, result.data]); setName(''); setPrice(''); setDays('30'); setAdding(false); }
    } catch { setError(t('packageFailed')); } finally { setBusy(false); }
  }
  async function archive(item: Package) {
    const before = packages;
    update(packages.filter((row) => row.id !== item.id));
    setError('');
    try {
      const result = await archivePackage({ id: item.id });
      if (result.error !== undefined) { update(before); setError(result.error); }
    } catch { update(before); setError(t('packageFailed')); }
  }

  return (
    <GlassCard role="region" className="space-y-4 p-5" aria-labelledby="packages-heading">
      <div className="space-y-1">
        <h2 id="packages-heading" className="text-xl font-bold">{t('packages')}</h2>
        <p className="text-sm text-muted">{t('packagesHint')}</p>
      </div>
      {packages.length === 0 && !adding ? <EmptyState icon={PackageIcon} title={t('noPackages')} body={t('packagesHint')} action={{ label: t('newPackage'), onClick: () => setAdding(true) }} /> : <ul className="space-y-2">{packages.map((item) => <li key={item.id} className="glass-raised flex min-h-12 items-center justify-between gap-3 rounded-control ps-4 pe-1">
        <div className="min-w-0 py-2"><p className="truncate font-bold">{item.name}</p>
          <p className="text-xs text-muted">{t('amount', { amount: formatNumber(item.price_egp, locale) })} · {t('days', { n: item.days, count: formatNumber(item.days, locale) })}
            {item.kind === 'sessions' && <> · {pt('sessionsLeft', { n: item.sessions ?? 0, count: formatNumber(item.sessions ?? 0, locale) })}</>}</p></div>
        <Button variant="ghost" className="min-h-12 min-w-12 px-0" aria-label={t('archivePackage', { name: item.name })} onClick={() => void archive(item)}><X aria-hidden className="size-5" /></Button>
      </li>)}</ul>}
      {adding ? <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void add(); }}>
        <Segmented aria-label={pt('kind')} value={kind} options={[{ value: 'days', label: pt('byDays') }, { value: 'sessions', label: pt('bySessions') }]} onChange={value => setKind(value as 'days' | 'sessions')} />
        {kind === 'sessions' && <Stepper label={pt('quantity')} value={sessions} min={1} max={200} step={1} onChange={setSessions} />}
        <TextField label={t('packageName')} value={name} maxLength={60} required onChange={(event) => setName(event.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label={t('packagePrice')} type="number" inputMode="numeric" min={0} max={100000} step={1} required value={price} onChange={(event) => setPrice(event.target.value)} />
          <TextField label={t('packageDays')} type="number" inputMode="numeric" min={1} max={365} step={1} required value={days} onChange={(event) => setDays(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="min-h-12 flex-1" disabled={!valid || busy}>{t('addPackage')}</Button>
          <Button variant="ghost" className="min-h-12" disabled={busy} onClick={() => { setAdding(false); setError(''); }}>{t('closeCollect')}</Button>
        </div>
      </form> : packages.length > 0 && <Button variant="secondary" className="min-h-12 w-full" onClick={() => setAdding(true)}><Plus aria-hidden className="size-5" />{t('newPackage')}</Button>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </GlassCard>
  );
}

'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { clickableClass, Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';

import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { messages as ptMessages } from '../packages/messages';
import { messages as durationMessages } from '../tiers/messages';
import { messages as freezeMessages } from '../freeze/messages';
import { duplicateDuration, durationLabel, durationPresets, firstUnusedDuration } from '../package-choice';

import { useState } from 'react';
import { Package as PackageIcon, Plus, X } from 'lucide-react';

import { EmptyState, GlassCard, Segmented, Stepper, TextField } from '@/ui';
import { archivePackage, createPackage } from '../data/finance-actions';
import type { Package } from '../types';
import type { CatalogPackage, Tier } from '../tiers/types';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
import { FreezeSettings } from '../freeze/freeze-settings';

export type PackageEditor = { item?: CatalogPackage; tierId: string; packages: CatalogPackage[]; tiers: Tier[]; tierLabel: string; noTierLabel: string; saveLabel: string;
  save: (value: { name: string; price: number; days: number; kind: 'days' | 'sessions'; sessions: number | null; tier_id: string | null; max_freeze_days: number | null }) => Promise<boolean> };

export function PackagesCard({ packages: initial, onChange, initialAdding = false, editor }: { packages: Package[]; onChange: (packages: Package[]) => void; initialAdding?: boolean; editor?: PackageEditor }) {
  const PlusIcon = captainWorkspaceEnabled() ? KoPlus : Plus;
  const t = useT(messages);
  const pt = useT(ptMessages);
  const dt = useT(durationMessages);
  const ft = useT(freezeMessages);
  const [freezeDays, setFreezeDays] = useState(editor?.item?.max_freeze_days == null ? '' : String(editor.item.max_freeze_days));
  const locale = useLocale();
  const success = useT(successMessages), toast = useToast();
  const [packages, setPackages] = useState(initial);
  const [adding, setAdding] = useState(initialAdding);
  const [name, setName] = useState(editor?.item?.name ?? '');
  const [price, setPrice] = useState(editor?.item ? String(editor.item.price_egp) : '');
  const initialDays = editor?.item?.days ?? (editor ? firstUnusedDuration(editor.packages, editor.tierId) : 30);
  const [days, setDays] = useState(String(initialDays ?? 1));
  const [custom, setCustom] = useState(initialDays === null || !durationPresets.some(value => value === initialDays));
  const [kind, setKind] = useState<'days' | 'sessions'>(editor?.item?.kind ?? 'days');
  const [sessions, setSessions] = useState(editor?.item?.sessions ?? 12);
  const [tierId, setTierId] = useState(editor?.item?.tier_id ?? editor?.tierId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const values = { name: name.trim(), price: Number(price), days: Number(days), kind, sessions: kind === 'sessions' ? sessions : null, max_freeze_days: freezeDays === '' ? null : Number(freezeDays) };
  const duplicate = editor && duplicateDuration(editor.packages, { ...values, id: editor.item?.id, tier_id: tierId || null });
  const valid = values.name.length > 0 && values.name.length <= 60 && price.trim() !== ''
    && Number.isInteger(values.price) && values.price >= 0 && values.price <= 100000
    && Number.isInteger(values.days) && values.days >= 1 && values.days <= 365 && !duplicate
    && (values.max_freeze_days === null || Number.isInteger(values.max_freeze_days) && values.max_freeze_days >= 0 && values.max_freeze_days <= 90);
  function update(next: Package[]) { setPackages(next); onChange(next); }

  async function add() {
    if (!valid || busy) return;
    setBusy(true); setError('');
    try {
      if (editor) {
        if (await editor.save({ ...values, tier_id: tierId || null })) toast.success({ title: success('packageSaved'), detail: success(values.kind === 'sessions' && values.sessions !== null ? 'sessionPackageDetail' : 'packageDetail', { name: values.name, days: formatNumber(values.days, locale), sessions: formatNumber(values.sessions ?? 0, locale) }), icon: 'payment' });
        return;
      }
      const result = await createPackage(values);
      if (result.error !== undefined) setError(result.error);
      else { update([...packages, result.data]); setName(''); setPrice(''); setDays('30'); setAdding(false);
        toast.success({ title: success('packageSaved'), detail: success(result.data.kind === 'sessions' && result.data.sessions !== null ? 'sessionPackageDetail' : 'packageDetail', { name: result.data.name, days: formatNumber(result.data.days, locale), sessions: formatNumber(result.data.sessions ?? 0, locale) }), icon: 'payment' }); }
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
    <GlassCard role="region" className="space-y-card-gap p-card" aria-labelledby="packages-heading">
      <div className="space-y-inline">
        <h2 id="packages-heading" className="text-xl font-bold">{t('packages')}</h2>
        <p className="text-sm text-muted">{t('packagesHint')}</p>
      </div>
      {packages.length === 0 && !adding ? <EmptyState icon={PackageIcon} title={t('noPackages')} body={t('packagesHint')} action={{ label: t('newPackage'), onClick: () => setAdding(true) }} /> : <ul className="space-y-inline">{packages.map((item) => <li key={item.id} className="glass-raised flex min-h-12 items-center justify-between gap-stack rounded-control ps-card pe-inline">
        <div className="min-w-0 py-inline"><p className="truncate font-bold">{item.name}</p>
          <p className="text-xs text-muted">{t('amount', { amount: formatNumber(item.price_egp, locale) })} · {t('days', { n: item.days, count: formatNumber(item.days, locale) })}
            {item.kind === 'sessions' && <> · {pt('sessionsLeft', { n: item.sessions ?? 0, count: formatNumber(item.sessions ?? 0, locale) })}</>}</p></div>
        {captainWorkspaceEnabled() ? <IconButton className="min-h-12 min-w-12 border border-danger/40 px-0 text-danger!" aria-label={t('archivePackage', { name: item.name })} onClick={() => void archive(item)}><X aria-hidden className="size-5" /></IconButton> : <Button variant="ghost" className="min-h-12 min-w-12 px-0" aria-label={t('archivePackage', { name: item.name })} onClick={() => void archive(item)}><X aria-hidden className="size-5" /></Button>}
      </li>)}</ul>}
      {adding ? <form className="space-y-stack" onSubmit={(event) => { event.preventDefault(); void add(); }}>
        {editor && <label className="block text-xs text-faint">{editor.tierLabel}<select value={tierId} onChange={event => {
          const nextTier = event.target.value;
          setTierId(nextTier);
          if (!editor.item) {
            const next = firstUnusedDuration(editor.packages, nextTier);
            setDays(String(next ?? 1)); setCustom(next === null);
          }
        }} className={captainWorkspaceEnabled() ? `${editableFieldClass} mt-inline min-h-12 w-full rounded-control border border-line bg-surface px-stack text-ink` : "mt-inline min-h-12 w-full rounded-control border border-line bg-surface px-stack text-ink"}>
          <option value="">{editor.noTierLabel}</option>{editor.tiers.map(tier => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
        </select></label>}
        <Segmented aria-label={pt('kind')} value={kind} options={[{ value: 'days', label: pt('byDays') }, { value: 'sessions', label: pt('bySessions') }]} onChange={value => setKind(value as 'days' | 'sessions')} />
        {kind === 'sessions' && <Stepper label={pt('quantity')} value={sessions} min={1} max={200} step={1} onChange={setSessions} />}
        {editor && kind === 'days' && <div className="glass flex flex-wrap gap-inline rounded-control p-inline" role="group" aria-label={dt('durationChoice')}>
          {durationPresets.map(value => {
            const used = duplicateDuration(editor.packages, { id: editor.item?.id, tier_id: tierId || null, kind: 'days', days: value, sessions: null });
            return <button key={value} type="button" disabled={used} aria-pressed={!custom && Number(days) === value}
              aria-describedby={used ? 'duration-used' : undefined} title={used ? dt('duplicateDuration') : undefined}
              className={captainWorkspaceEnabled() ? `${clickableClass} press min-h-12 cursor-pointer rounded-control border border-line px-stack text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime disabled:opacity-40 ${!custom && Number(days) === value ? 'glass-raised font-bold' : 'text-muted'}` : `press min-h-12 cursor-pointer rounded-control border border-line px-stack text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime disabled:opacity-40 ${!custom && Number(days) === value ? 'glass-raised font-bold' : 'text-muted'}`}
              onClick={() => { setDays(String(value)); setCustom(false); }}>{durationLabel(value, dt, locale)}</button>;
          })}
          <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={captainWorkspaceEnabled() ? `${clickableClass} press min-h-12 cursor-pointer rounded-control border border-line px-stack text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime ${custom ? 'glass-raised font-bold' : 'text-muted'}` : `press min-h-12 cursor-pointer rounded-control border border-line px-stack text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime ${custom ? 'glass-raised font-bold' : 'text-muted'}`}>{dt('customDuration')}</button>
        </div>}
        {editor && <p id="duration-used" role={duplicate ? 'alert' : undefined} className={`text-xs ${duplicate ? 'text-danger' : 'text-muted'}`}>
          {(duplicate || kind === 'days' && durationPresets.some(value => duplicateDuration(editor.packages, { id: editor.item?.id, tier_id: tierId || null, kind: 'days', days: value, sessions: null }))) && dt('duplicateDuration')}
        </p>}
        <TextField label={t('packageName')} value={name} maxLength={60} required onChange={(event) => setName(event.target.value)} />
        <div className="grid grid-cols-2 gap-stack">
          <TextField label={t('packagePrice')} type="number" inputMode="numeric" min={0} max={100000} step={1} required value={price} onChange={(event) => setPrice(event.target.value)} />
          {(!editor || kind === 'sessions' || custom) && <TextField label={t('packageDays')} type="number" inputMode="numeric" min={1} max={365} step={1} required value={days} onChange={(event) => setDays(event.target.value)} />}
        </div>
        <TextField label={ft('limit')} type="number" inputMode="numeric" min={0} max={90} step={1} value={freezeDays} onChange={event => setFreezeDays(event.target.value)} />
        <p className="text-xs text-muted">{ft('limitHint')}</p>
        <div className="flex flex-wrap gap-inline">
          <Button type="submit" className="min-h-12 flex-1" disabled={!valid || busy}>{editor?.item ? editor.saveLabel : t('addPackage')}</Button>
          {!editor && <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} className="min-h-12" disabled={busy} onClick={() => { setAdding(false); setError(''); }}>{t('closeCollect')}</Button>}
        </div>
      </form> : packages.length > 0 && <Button variant="secondary" className="min-h-12 w-full" onClick={() => setAdding(true)}><PlusIcon aria-hidden className="size-5" />{t('newPackage')}</Button>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!editor && <FreezeSettings />}
    </GlassCard>
  );
}

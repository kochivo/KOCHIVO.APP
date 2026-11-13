'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ScanLine } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, EmptyState, ErrorState, LoadingState } from '@/ui';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { alerts, metrics } from '../deltas';
import { deleteScan, listScans } from '../data/scans';
import { messages } from '../messages';
import { scanError } from '../errors';
import type { Scan } from '../types';
import { ScanMetrics } from './scan-metrics';
import { ScanFile } from './scan-file';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const ScanSheet = dynamic(() => import('./scan-sheet').then(module => module.ScanSheet), { ssr: false });

export function ScanSection({ playerId }: { playerId?: string }) {
  const t = useT(messages);
  const v6 = captainWorkspaceEnabled() && !playerId;
  const locale = useLocale();
  const [data, setData] = useState<{ scans: Scan[]; target: number | null; timezone?: string }>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState<Date>();
  useEffect(() => {
    let cancelled = false;
    void listScans(playerId).then(value => { if (!cancelled) { setData(value); setNow(new Date()); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [playerId, retry]);
  useEffect(() => {
    const update = () => setNow(new Date());
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  async function remove(scan: Scan) {
    if (deleting || !window.confirm(t('confirm'))) return;
    setDeleting(true); setError('');
    try {
      await deleteScan(scan, t);
      setData(current => current && { ...current, scans: current.scans.filter(row => row.id !== scan.id) });
    } catch (cause) { setError(scanError(cause, t, 'deleteError')); }
    finally { setDeleting(false); }
  }
  const scans = data?.scans ?? [];
  const warnings = now ? alerts(scans, now, data?.timezone) : null;
  const date = (scan: Scan) => formatDateAr(scan.scan_date, { day: 'numeric', month: 'short', year: 'numeric' }, locale);
  return <section className="space-y-4" aria-label={t('title')}>
    {v6 && data && scans.length > 0 && !failed ? <div className="glass-strong space-y-4 rounded-card border border-line-soft p-5">
      <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[19px] font-semibold">{t('title')}</h2>
        <Button variant="secondary" className="min-h-12 rounded-full" onClick={() => setSheet(true)}>{t('add')}</Button></header>
      <ScanMetrics scans={scans} total={false} target={data.target} embedded />
    </div> : <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{t('title')}</h2>
      {!playerId && <Button variant="secondary" className="min-h-12" onClick={() => setSheet(true)}>{t('add')}</Button>}</header>}
    {failed ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => setRetry(value => value + 1)} /> : !data ? <LoadingState variant="cards" /> : <>
      {playerId && warnings && <div className="space-y-2">
        {warnings.overdue && <p className="glass rounded-card p-4 text-muted">{t('overdue')}</p>}
        {warnings.regressing && <p role="status" className="glass rounded-card p-4 text-muted">{t('regressing')}</p>}
      </div>}
      {!scans.length ? <EmptyState icon={ScanLine} title={t('empty')} body={t('emptyBody')} /> : <>
        {playerId && <h3 className="text-sm text-muted">{t('latestMeasurements')}</h3>}
        {!v6 && <ScanMetrics scans={scans} total={Boolean(playerId)} target={data.target} />}
        {playerId ? <div className="grid grid-cols-2 gap-3">
          {[{ label: 'first', scan: scans[0] }, { label: 'latest', scan: scans.at(-1) }].map(({ label, scan }) => scan &&
            <div key={label} className="glass min-w-0 space-y-2 rounded-card p-3">
              <h3 className="font-bold">{t(label as 'first' | 'latest')}</h3>
              <ScanFile key={scan.id} path={scan.file_path} /><p className="text-sm text-muted">{date(scan)}</p>
            </div>)}
        </div> : <><h3 className="font-bold">{t('history')}</h3>
          <ol className="space-y-4 border-s border-ink/10 ps-4">
            {[...scans].reverse().map(scan => <li key={scan.id} className="glass space-y-3 rounded-card p-4">
              <p className="font-bold">{date(scan)}</p>
              <dl className="flex flex-wrap gap-3 text-sm">{metrics.map(metric => <div key={metric}>
                <dt className="text-muted">{t(metric)}</dt><dd>{scan[metric] == null ? t('unknown') : formatNumber(scan[metric], locale)} {t(metric === 'fat_pct' ? 'pct' : 'kg')}</dd>
              </div>)}</dl>
              <ScanFile path={scan.file_path} />
              <Button variant="secondary" className="min-h-12 border border-danger/40 text-danger" disabled={deleting} onClick={() => void remove(scan)}>{t('delete')}</Button>
            </li>)}
          </ol></>}
      </>}
    </>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {sheet && <ScanSheet onClose={() => setSheet(false)} onSaved={scan => {
      setData(current => ({ scans: [...(current?.scans ?? []), scan].sort((a, b) => a.scan_date.localeCompare(b.scan_date)), target: current?.target ?? null, timezone: current?.timezone }));
      setNow(new Date()); setFailed(false); setSheet(false);
    }} />}
  </section>;
}

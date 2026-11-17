'use client';
import { useCallback, useRef, useState } from 'react';
import { useResource } from '@/core/resource';
import { useT } from '@/core/i18n/client';
import { NumberInput } from '@/ui';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { useToast } from '@/ui/toast';
import { loadFreezeSettings, saveFreezeSettings } from '../data/freeze-settings';
import { messages } from './messages';

export function FreezeSettings() {
  const t = useT(messages), toast = useToast(), lock = useRef(false), attempted = useRef<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const load = useCallback(async () => {
    const result = await loadFreezeSettings();
    if (!result.data || result.error) throw new Error('Freeze settings unavailable');
    return result.data;
  }, []);
  const resource = useResource('billing:freeze-settings', load);
  async function save(days: number | null) {
    if (lock.current || !resource.data || days === resource.data.default_days) return;
    if (days !== null && (!Number.isInteger(days) || days < 0 || days > 90)) { setError(true); return; }
    attempted.current = days;
    lock.current = true; setBusy(true); setError(false);
    try {
      const ok = await resource.mutate(() => ({ default_days: days }), async () => {
        if ((await saveFreezeSettings(days)).error) throw new Error('Freeze settings save failed');
      });
      setError(!ok);
      if (ok) toast.success({ title: t('settingsSaved'), detail: t('defaultDays'), icon: 'check' });
    } finally { lock.current = false; setBusy(false); }
  }
  if (!resource.data && resource.status === 'error') return <ErrorState message={t('settingsLoadError')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />;
  if (!resource.data) return <LoadingState variant="detail" aria-label={t('settingsLoading')} />;
  return <section className="glass space-y-stack rounded-card p-card" aria-busy={busy}>
    <div className="max-w-md"><NumberInput label={t('defaultDays')} hint={t('defaultHint')} value={resource.data.default_days}
      min={0} max={90} step={1} inputMode="numeric" allowEmpty disabled={busy} onCommit={days => void save(days)} /></div>
    {busy && <p role="status" className="text-sm text-muted">{t('settingsSaving')}</p>}
    {error && <p role="alert" className="text-sm text-danger">{t('settingsSaveError')}</p>}
    {!error && resource.status === 'error' && <ErrorState message={t('settingsLoadError')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />}
    {error && <Button variant="secondary" disabled={busy} onClick={() => void save(attempted.current)}>{t('retry')}</Button>}
  </section>;
}

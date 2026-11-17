'use client';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { KoPlus } from '@/ui/icons/ko-plus';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { messages } from './v11/messages';
import { Button } from '@/ui/button';
const AssignDialog = dynamic(() => import('./v11-assign-dialog').then(module => module.V11AssignDialog));

export function V11NewPlan({ plans = [] }: { plans?: { id: string; title: string; calories?: number }[] }) {
  const t = useT(messages), router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);
  async function create() {
    if (lock.current) return;
    const title = window.prompt(t('planName'))?.trim();
    if (!title) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const { createTemplate } = await import('@/features/templates');
      const result = await createTemplate({ kind: 'nutrition', title });
      if (result.error !== undefined) { setError(result.error); return; }
      router.push(`/captain/nutrition/${result.data}`);
    } catch { setError(t('error')); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <PageBarTitle title={t('plans')} />
    <PageBarActions>
      <Button id="v11-assign" type="button" onClick={() => setAssigning(true)} variant="secondary" block={false}>{t('assign')}</Button>
      <Button type="button" disabled={busy} onClick={() => void create()} block={false}><KoPlus aria-hidden className="size-5" />{busy ? t('loading') : t('newPlan')}</Button>
    </PageBarActions>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {assigning && <AssignDialog plans={plans} onClose={() => { setAssigning(false); router.refresh(); }} />}
  </>;
}

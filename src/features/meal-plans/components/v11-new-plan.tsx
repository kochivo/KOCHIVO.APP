'use client';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { KoPlus } from '@/ui/icons/ko-plus';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { messages } from './v11/messages';
const AssignDialog = dynamic(() => import('./v11-assign-dialog').then(module => module.V11AssignDialog));

export function V11NewPlan({ card = false, plans = [] }: { card?: boolean; plans?: { id: string; title: string }[] }) {
  const t = useT(messages), router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);
  async function create() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const { createTemplate } = await import('@/features/templates');
      const result = await createTemplate({ kind: 'nutrition' });
      if (result.error !== undefined) { setError(result.error); return; }
      router.push(`/captain/nutrition/${result.data}`);
    } catch { setError(t('error')); }
    finally { lock.current = false; setBusy(false); }
  }
  const button = <button type="button" disabled={busy} onClick={() => void create()} className={card ? 'glass flex min-h-[120px] w-full flex-col items-center justify-center gap-1.5 rounded-card border border-line-soft p-5 text-lime' : 'flex min-h-12 items-center gap-2 rounded-full bg-lime px-5 font-semibold text-on-lime'}><KoPlus aria-hidden className="size-5" />{busy ? t('loading') : t('newPlan')}{card && <small className="text-muted">{t('newHint')}</small>}</button>;
  return <>{card ? button : <><PageBarTitle title={t('plans')} /><PageBarActions><button id="v11-assign" type="button" onClick={() => setAssigning(true)} className="glass inline-flex min-h-12 items-center rounded-full border border-line px-4 text-sm">{t('assign')}</button>{button}</PageBarActions></>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}{assigning && <AssignDialog plans={plans} onClose={() => { setAssigning(false); router.refresh(); }} />}</>;
}

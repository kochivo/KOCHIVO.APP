'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useTimezone } from '@/core/timezone/client';
import { useEffect, useState, useTransition } from 'react';
import { useT } from '@/core/i18n/client';
import { localDate } from '@/lib/dates';
import { Button } from '@/ui/button';
import { createPlayerInvite } from '../data/create-player-invite';
import { loadInvitePackages } from '../data/invite-packages';
import type { InvitePackage, PlayerInvite } from '../invite-plan';
import { messages } from '../invites/messages';
import { InviteForm } from './invite-form';
import { InviteResult } from './invite-result';
import type { FormDraft } from '@/features/forms';
import { useDemoExpiry } from '@/features/demo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { messages as pageMessages } from '../invites/page-messages';

export function InviteContent({ captainFirstName, assessments = [] }: { captainFirstName: string; assessments?: FormDraft[] | null }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const p = useT(pageMessages), router = useRouter(), demo = useDemoExpiry();
  const [packages, setPackages] = useState<InvitePackage[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ code: string; input: PlayerInvite } | null>(null);
  const [today] = useState(() => localDate(new Date(), timezone));
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [router]);
  useEffect(() => {
    let live = true;
    loadInvitePackages().then(response => {
      if (!live) return;
      if ('error' in response) setLoadError(response.error);
      else { setPackages(response.packages); setLoadError(''); }
    }).catch(() => { if (live) setLoadError(t('loadError')); });
    return () => { live = false; };
  }, [attempt, t]);
  function save(input: PlayerInvite) {
    setError('');
    startTransition(async () => {
      try {
        const response = await createPlayerInvite(input);
        if ('error' in response) setError(response.error);
        else setResult({ code: response.code, input: { ...input, name: input.name.trim() } });
      } catch { setError(t('failed')); }
    });
  }
  if (demo) return <p className="glass rounded-card p-5 text-muted">{t('demo')}</p>;
  if (assessments === null) return <div className="glass space-y-3 rounded-card p-5"><p role="alert">{p('formsError')}</p><Button variant="secondary" onClick={() => router.refresh()}>{t('retry')}</Button></div>;
  if (loadError) return <div className="space-y-3"><p role="alert" className="text-danger">{loadError}</p>
    <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} onClick={() => { setLoadError(''); setAttempt(value => value + 1); }}>{t('retry')}</Button></div>;
  if (!packages) return <p role="status" className="text-muted">{t('loading')}</p>;
  if (result) return <div className="mx-auto max-w-xl space-y-5"><Link href="/captain/players" className="glass inline-flex min-h-12 items-center rounded-control px-4">{p('players')}</Link>
    <InviteResult {...result} pkg={packages.find(pkg => pkg.id === result.input.packageId)} captainFirstName={captainFirstName} onAnother={() => setResult(null)} /></div>;
  return <InviteForm packages={packages} forms={assessments} today={today} busy={pending} error={error} onSave={save} />;
}

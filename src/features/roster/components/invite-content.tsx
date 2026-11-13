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

export function InviteContent({ captainFirstName }: { captainFirstName: string }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const [packages, setPackages] = useState<InvitePackage[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ code: string; input: PlayerInvite } | null>(null);
  const [today] = useState(() => localDate(new Date(), timezone));
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
  if (loadError) return <div className="space-y-3"><p role="alert" className="text-danger">{loadError}</p>
    <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} onClick={() => { setLoadError(''); setAttempt(value => value + 1); }}>{t('retry')}</Button></div>;
  if (!packages) return <p role="status" className="text-muted">{t('loading')}</p>;
  if (result) return <InviteResult {...result} pkg={packages.find(pkg => pkg.id === result.input.packageId)} captainFirstName={captainFirstName} />;
  return <InviteForm packages={packages} today={today} busy={pending} error={error} onSave={save} />;
}

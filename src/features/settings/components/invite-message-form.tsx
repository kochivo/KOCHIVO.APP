'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useId, useState } from 'react';
import { Button } from '@/ui';
import { saveInviteMessage } from '../data/settings';

export function InviteMessageForm({ initialMessage, onSave }: { initialMessage: string | null; onSave?: (profile: NonNullable<Awaited<ReturnType<typeof saveInviteMessage>>['data']>) => void }) {
  const t = useT(messages);
  const id = useId();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  return <form className="glass space-y-card-gap rounded-card p-section" onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage('');
    try {
      const result = await saveInviteMessage({ invite_message: form.get('invite_message') });
      if (result.data) onSave?.(result.data);
      setMessage(result.error ?? t('saved'));
    } catch { setMessage(t('saveFailedTryAgain')); }
    finally { setPending(false); }
  }}>
    <h2 className="text-lg font-bold">{t('inviteMessage')}</h2>
    <label htmlFor={id} className="block text-sm text-muted">{t('defaultInviteMessageUpTo500')}</label>
    <textarea id={id} name="invite_message" maxLength={500} defaultValue={initialMessage ?? ''} disabled={pending}
      className={captainWorkspaceEnabled() ? `${editableFieldClass} min-h-32 w-full rounded-control border border-line bg-surface p-card text-start text-ink` : "min-h-32 w-full rounded-control border border-line bg-surface p-card text-start text-ink"} />
    <Button type="submit" variant="secondary" className="min-h-12" disabled={pending}>{pending ? t('saving') : t('save')}</Button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}

import { useId, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useToast } from '@/ui/toast';
import { saveInviteMessage } from '../../data/settings';
import { messages } from '../../messages';
import type { SettingsProfile } from '../../schema';
import { SaveBar } from './save-bar';

export function InviteSection({ profile, onSave }: { profile: SettingsProfile; onSave: (profile: SettingsProfile) => void }) {
  const t = useT(messages), toast = useToast(), id = useId();
  const saved = profile.invite_message ?? '';
  const [draft, setDraft] = useState(saved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const dirty = draft !== saved;

  return <form className="space-y-stack" onSubmit={async event => {
    event.preventDefault();
    if (!dirty || lock.current) return;
    lock.current = true; setPending(true); setError('');
    try {
      const result = await saveInviteMessage({ invite_message: draft });
      if (result.data) {
        setDraft(result.data.invite_message ?? ''); onSave(result.data); toast.success(t('saved'));
      } else setError(result.error ?? t('saveFailedTryAgain'));
    } catch { setError(t('saveFailedTryAgain')); }
    finally { lock.current = false; setPending(false); }
  }}>
    <label htmlFor={id} className="block text-sm text-muted">{t('defaultInviteMessageUpTo500')}</label>
    <textarea id={id} name="invite_message" maxLength={500} value={draft} disabled={pending}
      onChange={event => setDraft(event.target.value)}
      className={`${editableFieldClass} min-h-32 w-full rounded-control border border-line bg-surface p-card text-start text-ink`} />
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <SaveBar dirty={dirty} pending={pending} onReset={() => { setDraft(saved); setError(''); }} />
  </form>;
}

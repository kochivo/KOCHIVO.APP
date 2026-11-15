'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { coachSlug } from '@/lib/coach-slug';
import { Button, TextField } from '@/ui';
import { messages } from '../messages';

export function PublicSlugField({ value, error, onChange }: { value: string; error?: string; onChange: (value: string) => void }) {
  const t = useT(messages);
  const [status, setStatus] = useState('');
  return <div className="space-y-inline">
    <TextField label={t('publicSlug')} value={value} maxLength={30} dir="ltr" error={error}
      onChange={event => { onChange(event.target.value); setStatus(''); }} />
    <p dir="ltr" className="break-all text-sm text-muted">{t('publicPreview', { slug: value })}</p>
    <Button type="button" variant="secondary" disabled={!coachSlug(value)} onClick={async () => {
      try { await navigator.clipboard.writeText(`https://kochivo.site/c/${value}`); setStatus(t('copied')); }
      catch { setStatus(t('copyFailed')); }
    }}>{t('copyLink')}</Button>
    <p role="status" className="text-sm text-muted">{status}</p>
  </div>;
}

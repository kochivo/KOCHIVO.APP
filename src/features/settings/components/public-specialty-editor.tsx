'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/text-field';
import { validSpecialties } from '@/lib/public-specialties';
import { messages } from '../public-page/messages';

export function PublicSpecialtyEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const t = useT(messages), [draft, setDraft] = useState('');
  return <div className="space-y-3">
    <p className="text-sm text-muted">{t('hint')}</p>
    {items.length > 0 && <ul className="flex flex-wrap gap-2">{items.map((item, index) => <li key={`${index}-${item}`}>
      <button type="button" aria-label={t('remove', { name: item })} onClick={() => onChange(items.filter((_, i) => i !== index))}
        className="glass min-h-12 rounded-full px-4">{item}</button>
    </li>)}</ul>}
    <TextField label={t('specialties')} value={draft} maxLength={30} onChange={event => setDraft(event.target.value)} />
    <Button type="button" variant="secondary" disabled={!draft.trim() || !validSpecialties([...items, draft])}
      onClick={() => { onChange([...items, draft.trim()]); setDraft(''); }}>{t('add')}</Button>
  </div>;
}

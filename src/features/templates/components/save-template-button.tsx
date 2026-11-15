'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import { Button } from '@/ui/button';
import { saveAsTemplate } from '../data/templates';
import type { TemplateKind } from '../types';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';

export function SaveTemplateButton({ kind, id, title }: { kind: TemplateKind; id: string; title: string }) {
  const t = useT(messages);
  const toast = useToast();
  const success = useT(successMessages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastTitle, setLastTitle] = useState(title);
  async function save(name: string) {
    if (busy) return;
    setBusy(true); setError(''); setLastTitle(name);
    try {
      const result = await saveAsTemplate({ kind, id, title: name });
      if (result.error !== undefined) setError(result.error);
      else toast.success({ title: success('saved'), detail: success('name', { name }), icon: 'template' });
    } catch { setError(t('couldntSaveTemplateTryAgain')); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-1">
    <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} className="min-h-12" disabled={busy} onClick={() => {
      const name = window.prompt(t('templateName'), title);
      if (name !== null) void save(name);
    }}>{t('saveAsTemplate')}</Button>
    {busy && <p role="status" className="text-sm text-muted">{t('savingTemplate')}</p>}
    {error && <div role="alert" className="text-sm text-danger">{error}
      <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} className="min-h-12" disabled={busy} onClick={() => void save(lastTitle)}>{t('tryAgain')}</Button>
    </div>}
  </div>;
}

'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { HeartPulse } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { messages } from '../pain-controls/messages';
import type { useFocusSession } from '../hooks/use-focus-session';

const PainFlow = dynamic(() => import('./pain-flow').then(module => module.PainFlow), { ssr: false });
export function PainButton({ state }: { state: ReturnType<typeof useFocusSession> }) {
  const t = useT(messages);
  const [open, setOpen] = useState(false);
  return <>
    <Button id="pain-button" variant="secondary" aria-label={t('open')} onClick={() => { state.rest.skip(); setOpen(true); }} disabled={state.disabled}>
      <HeartPulse aria-hidden className="size-5" />{t('open')}
    </Button>
    {open && <PainFlow state={state} onClose={() => setOpen(false)} />}
  </>;
}

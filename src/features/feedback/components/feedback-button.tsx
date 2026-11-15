'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquareWarning } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import type { DeviceRole } from '@/core/pwa/device-role';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';

const FeedbackSheet = dynamic(() => import('./feedback-sheet').then(module => module.FeedbackSheet), {
  ssr: false, loading: () => <LoadingState className="sheet fixed bottom-6 end-4 z-40 rounded-card p-6" />,
});

export function FeedbackButton({ role }: { role: DeviceRole }) {
  const t = useT(messages);
  const [open, setOpen] = useState(false);
  const docked = role === 'captain' && captainWorkspaceEnabled();
  return <>
    <Button type="button" data-floating-fab aria-label={t('report')} onClick={() => setOpen(true)}
      variant={(docked) ? 'secondary' : 'secondary'} block={false} className={docked ? "fixed end-4 bottom-[calc(var(--nav-clearance)+0.5rem)] z-30 flex min-h-12 min-w-12 items-center justify-center gap-2 text-muted lg:static lg:shrink-0 lg:px-3"
        : "fixed end-4 bottom-[calc(var(--nav-clearance)+0.5rem)] z-30 flex min-h-12 min-w-12 items-center justify-center text-muted lg:bottom-6"}>
      <MessageSquareWarning aria-hidden="true" className="size-5" />
      {docked && <span className="hidden text-xs lg:inline">{t('report')}</span>}
    </Button>
    {open && <FeedbackSheet role={role} onClose={() => setOpen(false)} />}
  </>;
}

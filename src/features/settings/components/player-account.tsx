'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useCaptainContext } from '@/features/player-shell';
import { useProgramSnapshot } from '@/features/player-home';
import { internationalEnabled } from '@/lib/international-enabled';
import type { SettingsProfile } from '../schema';
import { messages } from '../player-messages';
import { messages as v6Messages } from '../v6-messages';
import { PlayerPreferences } from './player-preferences';
import { PlayerIdentity } from './player-identity';
import { PlayerStatTiles } from './player-stat-tiles';
import { ProfileWriteContext, useProfileWriter } from '../hooks/use-profile-write';

export function PlayerAccount({ profile, profileForm, children, install, signOut, onProfileSave }: {
  profile: SettingsProfile | null; profileForm: ReactNode; children?: ReactNode; install: ReactNode; signOut: ReactNode;
  onProfileSave: (profile: SettingsProfile) => void;
}) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const captain = useCaptainContext();
  const { snapshot } = useProgramSnapshot(profile?.id);
  const writer = useProfileWriter();
  const current = profile;
  return <ProfileWriteContext value={writer}><main className="mx-auto -mt-2.5 -ms-0.5 -me-0.5 max-w-lg space-y-stack pb-section">
    <header className="flex items-center gap-stack">
      <Link href="/player" aria-label={t('back')} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised">
        <ChevronRight aria-hidden className="dir-icon size-5" />
      </Link><h1 className="font-sans text-h font-black!">{t('title')}</h1>
    </header>
    {current ? <>
      <PlayerIdentity profile={current} captainName={captain.data?.fullName} accessUntil={captain.data?.accessUntil}
        plan={snapshot?.title} onSave={onProfileSave} />
      <PlayerStatTiles playerId={current.id} snapshot={snapshot} />
      <PlayerPreferences units={current.units ?? 'metric'} />
    </> : profileForm}
    <section aria-label={t('more')} className="overflow-hidden rounded-[24px] border border-line-soft bg-surface">
      <details className="group"><summary className="flex min-h-[60px] cursor-pointer items-center px-page-x text-sm">{t('more')}</summary>
        <div className="divide-y divide-line-soft border-t border-line-soft [&>div]:min-h-[60px]">
          {current && internationalEnabled() && <PlayerPreferences units={current.units ?? 'metric'} styleOnly />}
          {current && <details><summary className="flex min-h-[60px] cursor-pointer items-center px-page-x text-sm">{t('edit')}</summary><div className="p-stack">{profileForm}</div></details>}
          <div className="min-h-[60px] p-stack">{install}</div>
          <div className="divide-y divide-line-soft [&>div]:px-page-x [&>div]:py-stack [&>section]:rounded-none [&>section]:border-0 [&>section]:bg-transparent [&>section]:p-card [&>section]:shadow-none [&>button]:min-h-[60px] [&>button]:rounded-none [&>button]:bg-transparent [&>button]:px-page-x [&>button]:py-stack [&>button]:shadow-none">{children}</div>
          <div className="flex min-h-[60px] items-center gap-stack px-page-x py-stack"><Sparkles aria-hidden className="size-6 shrink-0 text-lime" />
            <span><span className="block text-sm">{v6t('ko')}</span><span className="text-xs text-muted">{t('soon')}</span></span></div>
        </div>
      </details>
    </section>
    <div aria-label={t('logout')} className="[&_button]:min-h-[52px] [&_button]:w-full [&_button]:rounded-full [&_button]:border-0! [&_button]:bg-transparent! [&_button]:font-sans [&_button]:text-sm [&_button]:font-bold [&_button]:text-muted! [&_button]:shadow-none!">{signOut}</div>
  </main></ProfileWriteContext>;
}

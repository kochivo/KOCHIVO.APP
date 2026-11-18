import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useT } from '@/core/i18n/client';
import { TIMEZONE_CHANGED } from '@/core/timezone/timezone-provider';
import { LoadingState } from '@/ui/loading-state';
import { useToast } from '@/ui/toast';
import { messages } from '../../messages';
import type { SettingsProfile } from '../../schema';
import { WorkspacePreferences } from '../workspace-preferences';

const Options = dynamic(() => import('../workspace-options').then(m => m.WorkspaceOptions), {
  loading: () => <LoadingState variant="detail" />,
});

export function PreferencesSection({ profile, onSave }: {
  profile: SettingsProfile; onSave: (profile: SettingsProfile) => void;
}) {
  const t = useT(messages), toast = useToast();
  useEffect(() => {
    const events = [TIMEZONE_CHANGED, 'kochivo:glass-change', 'kochivo:theme-change'];
    const saved = () => toast.success(t('saved'));
    for (const event of events) window.addEventListener(event, saved);
    return () => { for (const event of events) window.removeEventListener(event, saved); };
  }, [t, toast]);

  return <>
    <WorkspacePreferences profile={profile} update={onSave} />
    <Options />
  </>;
}

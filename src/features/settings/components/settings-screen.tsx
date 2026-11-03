'use client';
import { useT } from '@/core/i18n/client';
import { LanguageSwitch } from '@/ui/language-switch';
import { messages } from '../messages';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ErrorState, LoadingState, ThemeSwitch } from '@/ui';
import { loadSettings } from '../data/settings';
import type { SettingsProfile } from '../schema';
import { ProfileForm } from './profile-form';
import { InviteMessageForm } from './invite-message-form';
import { ExportCard } from './export-card';
import { DeleteAccountCard } from './delete-account-card';
import { GlassToggle } from './glass-toggle';
import { demoExpiry, useDemoExpiry } from '@/features/demo';

export function SettingsScreen({ signOut }: { signOut?: ReactNode }) {
  const t = useT(messages);
  const demo = useDemoExpiry();
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void loadSettings().then((result) => {
      if (!active) return;
      if (result.data) { setProfile(result.data); setError(''); }
      else setError(result.error);
      setLoading(false);
    }).catch(() => {
      if (active) { setError(t('couldnTLoadSettings')); setLoading(false); }
    });
    return () => { active = false; };
  }, [attempt, t]);
  return <div className="mx-auto max-w-3xl space-y-5">
    <h1 className="text-2xl font-extrabold">{t('settings')}</h1>
    <LanguageSwitch />
    <GlassToggle />
    <ThemeSwitch />
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retryLabel={t('tryAgain')} onRetry={() => {
      setLoading(true); setError(''); setAttempt((value) => value + 1);
    }} /> : profile ? <>
      <ProfileForm profile={profile} />
      {profile.role === 'captain' && <InviteMessageForm initialMessage={profile.invite_message} />}
      <ExportCard />
      {!demo && !demoExpiry(profile) && <DeleteAccountCard requestedAt={profile.deletion_requested_at} />}
    </> : null}
    {signOut}
  </div>;
}

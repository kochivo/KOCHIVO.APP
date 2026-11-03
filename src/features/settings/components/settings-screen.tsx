'use client';

import { useEffect, useState } from 'react';
import { ErrorState, LoadingState } from '@/ui';
import { loadSettings } from '../data/settings';
import type { SettingsProfile } from '../schema';
import { ProfileForm } from './profile-form';
import { InviteMessageForm } from './invite-message-form';
import { ExportCard } from './export-card';
import { DeleteAccountCard } from './delete-account-card';
import { GlassToggle } from './glass-toggle';
import { demoExpiry, useDemoExpiry } from '@/features/demo';

export function SettingsScreen() {
  const demo = useDemoExpiry();
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void loadSettings().then((result) => {
      if (!active) return;
      if (result.data) setProfile(result.data);
      else setError(result.error);
      setLoading(false);
    }).catch(() => {
      if (active) { setError('مش قادرين نحمّل الإعدادات'); setLoading(false); }
    });
    return () => { active = false; };
  }, [attempt]);
  return <div className="mx-auto max-w-3xl space-y-5">
    <h1 className="text-2xl font-extrabold">الإعدادات</h1>
    <GlassToggle />
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retryLabel="جرّب تاني" onRetry={() => {
      setLoading(true); setError(''); setAttempt((value) => value + 1);
    }} /> : profile ? <>
      <ProfileForm profile={profile} />
      {profile.role === 'captain' && <InviteMessageForm initialMessage={profile.invite_message} />}
      <ExportCard />
      {!demo && !demoExpiry(profile) && <DeleteAccountCard requestedAt={profile.deletion_requested_at} />}
    </> : null}
  </div>;
}

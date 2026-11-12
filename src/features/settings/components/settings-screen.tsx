'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { LOCALES } from '@/core/i18n/locale';
import type { Locale } from '@/core/i18n/locale';
import { setLocale } from '@/core/i18n/set-locale';
import { messages as appearanceMessages } from '@/ui/messages';
import { applyOptimistic } from '@/lib/optimistic';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ErrorState, LoadingState, ThemeSwitch } from '@/ui';
import { LanguageSwitch } from '@/ui/language-switch';
import { internationalEnabled } from '@/lib/international-enabled';
import { saveLanguage } from '../data/language';
import { loadSettings } from '../data/settings';
import type { SettingsProfile } from '../schema';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ExportCard } from './export-card';
import { DeleteAccountCard } from './delete-account-card';
import { GlassToggle } from './glass-toggle';
import { demoExpiry, useDemoExpiry } from '@/features/demo';
import { TourReplay } from '@/ui/tour-replay';
import { PushToggleCard } from '@/features/notifications';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const CaptainProfileCard = dynamic(() => import('./captain-profile-card').then(module => module.CaptainProfileCard));
const InviteMessageForm = dynamic(() => import('./invite-message-form').then(module => module.InviteMessageForm));
const PlayerAccount = dynamic(() => import('./player-account').then(module => module.PlayerAccount), { loading: () => <LoadingState variant="detail" /> });
const InstallButton = dynamic(() => import('@/features/install').then(module => module.InstallButton), { ssr: false });
const ProfileForm = dynamic(() => import('./profile-form').then(module => module.ProfileForm), { loading: () => <LoadingState variant="detail" /> });

export function SettingsScreen({ signOut }: { signOut?: ReactNode }) {
  const t = useT(messages);
  const appearanceT = useT(appearanceMessages);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const playerSettings = captainWorkspaceEnabled() ? /^(?:\/(?:ar|en))?\/player(?:\/|$)/.test(pathname) : pathname.startsWith('/player');
  const [language, setLanguage] = useState(locale);
  const [languageError, setLanguageError] = useState('');
  const [languagePending, setLanguagePending] = useState(false);
  const languageInFlight = useRef(false);
  const demo = useDemoExpiry();
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  async function changeLanguage(value: Locale) {
    if (languageInFlight.current || value === language) return;
    languageInFlight.current = true; setLanguagePending(true); setLanguageError('');
    try {
      await applyOptimistic(language, {
        apply: () => setLanguage(value), rollback: setLanguage,
      }, () => setLocale(value));
      router.refresh();
    } catch { setLanguageError(appearanceT('languageFailed')); }
    finally { languageInFlight.current = false; setLanguagePending(false); }
  }
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
  if (playerSettings && captainWorkspaceEnabled()) return <PlayerAccount profile={profile}
    profileForm={loading ? <LoadingState variant="detail" /> : error ? <ErrorState message={error} retryLabel={t('tryAgain')} onRetry={() => {
      setLoading(true); setError(''); setAttempt(value => value + 1);
    }} /> : profile ? <ProfileForm profile={profile} /> : null}
    install={<InstallButton role="player" />} signOut={signOut}>
    <GlassToggle /><ThemeSwitch /><PushToggleCard />
    {profile && <><TourReplay role={profile.role} /><ExportCard />
      {!demo && !demoExpiry(profile) && <DeleteAccountCard requestedAt={profile.deletion_requested_at} />}</>}
  </PlayerAccount>;
  return <div className="mx-auto max-w-3xl space-y-5">
    {playerSettings && <Link href="/player" className="inline-flex min-h-12 items-center text-muted">{t('backToPlayer')}</Link>}
    <h1 className="text-2xl font-extrabold">{t('settings')}</h1>
    {playerSettings && (loading ? <LoadingState variant="detail" /> : error ? <ErrorState message={error} retryLabel={t('tryAgain')} onRetry={() => {
      setLoading(true); setError(''); setAttempt(value => value + 1);
    }} /> : profile ? <ProfileForm profile={profile} /> : null)}
    {internationalEnabled() ? <LanguageSwitch onChange={saveLanguage} /> : <div>
      <div role="group" aria-label={appearanceT('language')} className="flex gap-1">
        {LOCALES.map(value => <button key={value} type="button" lang={value} aria-pressed={language === value}
          disabled={languagePending} onClick={() => void changeLanguage(value)}
          className="min-h-12 rounded-control px-3 text-sm text-muted aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:text-ink disabled:opacity-40">
          {appearanceT(value === 'ar' ? 'arabic' : 'english')}
        </button>)}
      </div>
      {languageError && <p role="alert" className="text-sm text-danger">{languageError}</p>}
    </div>}
    <GlassToggle />
    <ThemeSwitch />
    <InstallButton role={playerSettings ? 'player' : 'captain'} />
    <PushToggleCard />
    {loading ? (!playerSettings && <LoadingState variant="detail" />) : error ? (!playerSettings && <ErrorState message={error} retryLabel={t('tryAgain')} onRetry={() => {
      setLoading(true); setError(''); setAttempt((value) => value + 1);
    }} />) : profile ? <>
      {profile.role === 'captain' && <CaptainProfileCard profile={profile} onSave={setProfile} />}
      <TourReplay role={profile.role} />
      {profile.role === 'captain' && <InviteMessageForm initialMessage={profile.invite_message} />}
      <ExportCard />
      {!demo && !demoExpiry(profile) && <DeleteAccountCard requestedAt={profile.deletion_requested_at} />}
    </> : null}
    {signOut}
  </div>;
}

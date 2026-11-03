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
import { loadSettings } from '../data/settings';
import type { SettingsProfile } from '../schema';
import { ProfileForm } from './profile-form';
import { InviteMessageForm } from './invite-message-form';
import { ExportCard } from './export-card';
import { DeleteAccountCard } from './delete-account-card';
import { GlassToggle } from './glass-toggle';
import { demoExpiry, useDemoExpiry } from '@/features/demo';
import { TourReplay } from '@/ui/tour-replay';

export function SettingsScreen({ signOut }: { signOut?: ReactNode }) {
  const t = useT(messages);
  const appearanceT = useT(appearanceMessages);
  const locale = useLocale();
  const router = useRouter();
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
  return <div className="mx-auto max-w-3xl space-y-5">
    <h1 className="text-2xl font-extrabold">{t('settings')}</h1>
    <div>
      <div role="group" aria-label={appearanceT('language')} className="flex gap-1">
        {LOCALES.map(value => <button key={value} type="button" lang={value} aria-pressed={language === value}
          disabled={languagePending} onClick={() => void changeLanguage(value)}
          className="min-h-12 rounded-control px-3 text-sm text-muted aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:text-ink disabled:opacity-40">
          {appearanceT(value === 'ar' ? 'arabic' : 'english')}
        </button>)}
      </div>
      {languageError && <p role="alert" className="text-sm text-danger">{languageError}</p>}
    </div>
    <GlassToggle />
    <ThemeSwitch />
    {loading ? <LoadingState variant="detail" /> : error ? <ErrorState message={error} retryLabel={t('tryAgain')} onRetry={() => {
      setLoading(true); setError(''); setAttempt((value) => value + 1);
    }} /> : profile ? <>
      <ProfileForm profile={profile} />
      <TourReplay role={profile.role} />
      {profile.role === 'captain' && <InviteMessageForm initialMessage={profile.invite_message} />}
      <ExportCard />
      {!demo && !demoExpiry(profile) && <DeleteAccountCard requestedAt={profile.deletion_requested_at} />}
    </> : null}
    {signOut}
  </div>;
}

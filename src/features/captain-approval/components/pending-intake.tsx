import { getT } from '@/core/i18n/server';
import { SignOutButton } from '@/features/auth';
import { loadIntake } from '../data/intake';
import { messages } from '../intake/messages';
import { CaptainPendingScreen } from './captain-pending-screen';
import { IntakeForm } from './intake-form';
import { IntakeLoadError } from './intake-load-error';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function PendingIntake({ status }: { status: 'pending' | 'rejected' }) {
  if (status === 'rejected') return <CaptainPendingScreen status={status} />;
  const { profile, error } = await loadIntake();
  const t = await getT(messages);
  if (error || !profile) return <IntakeLoadError error={error ?? t('loadFailed')} />;
  if (profile.captain_intake !== null) return <CaptainPendingScreen status={status} />;
  return <main className={captainWorkspaceEnabled() ? 'mx-auto grid min-h-dvh w-full max-w-3xl content-start gap-stack p-card text-start sm:p-section' : 'flex min-h-dvh items-center justify-center p-section text-start'}>
    {captainWorkspaceEnabled() && <header className="glass flex min-h-16 items-center rounded-card px-page-x py-stack"><h1 className="text-md font-bold">{t('title')}</h1></header>}
    <div className="w-full max-w-2xl space-y-card-gap">
      <IntakeForm fullName={profile.full_name} whatsapp={profile.social.whatsapp} instagram={profile.social.instagram} />
      <SignOutButton variant="danger" className={captainWorkspaceEnabled() ? 'min-h-12 w-full border border-line !bg-surface !text-ink' : 'min-h-12 w-full'} />
    </div>
  </main>;
}

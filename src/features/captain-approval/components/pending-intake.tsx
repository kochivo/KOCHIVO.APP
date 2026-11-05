import { getT } from '@/core/i18n/server';
import { loadIntake } from '../data/intake';
import { messages } from '../intake/messages';
import { CaptainPendingScreen } from './captain-pending-screen';
import { IntakeForm } from './intake-form';
import { IntakeLoadError } from './intake-load-error';

export async function PendingIntake({ status }: { status: 'pending' | 'rejected' }) {
  if (status === 'rejected') return <CaptainPendingScreen status={status} />;
  const { profile, error } = await loadIntake();
  const t = await getT(messages);
  if (error || !profile) return <IntakeLoadError error={error ?? t('loadFailed')} />;
  if (profile.captain_intake !== null) return <CaptainPendingScreen status={status} />;
  return <main className="flex min-h-dvh items-center justify-center p-6 text-start">
    <IntakeForm fullName={profile.full_name} whatsapp={profile.social.whatsapp} instagram={profile.social.instagram} />
  </main>;
}

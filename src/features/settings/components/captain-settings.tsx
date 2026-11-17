'use client';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { demoExpiry, useDemoExpiry } from '@/features/demo';
import { SubscriptionEntry } from '@/features/billing';
const FoodPricesEntry = dynamic(() => import('@/features/meal-plans').then(module => module.FoodPricesEntry));
import { messages as legacyMessages } from '../messages';
import { messages } from '../workspace/messages';
import { deletionRequestedAt } from '../deletion';
import { loadCaptainSettings } from '../data/workspace-settings';
import type { SettingsProfile } from '../schema';
import { WorkspaceFact } from './workspace-fact';
import { WorkspaceSheet } from './workspace-sheet';
import { WorkspacePreferences } from './workspace-preferences';
import { WorkspacePageCard } from './workspace-page-card';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { useTimezone } from '@/core/timezone/client';
import { localDate } from '@/lib/dates';
import { ramadanSettingsVisible } from '@/lib/ramadan-calendar';

const Profile = dynamic(() => import('./captain-profile-card').then(m => m.CaptainProfileCard), { loading: () => <LoadingState variant="detail" /> });
const PaymentMethods = dynamic(() => import('./payment-methods-card').then(m => m.PaymentMethodsCard), { loading: () => <LoadingState variant="detail" /> });
const Invite = dynamic(() => import('./invite-message-form').then(m => m.InviteMessageForm));
const Export = dynamic(() => import('./export-card').then(m => m.ExportCard));
const Delete = dynamic(() => import('./delete-account-card').then(m => m.DeleteAccountCard));
const Options = dynamic(() => import('./workspace-options').then(m => m.WorkspaceOptions));
const PublicPage = dynamic(() => import('./public-page-settings').then(m => m.PublicPageSettings), { loading: () => <LoadingState variant="detail" /> });
type Panel = 'profile' | 'invite' | 'download' | 'delete' | 'more';
const Ramadan = dynamic(() => import('./ramadan-settings').then(m => m.RamadanSettings), { loading: () => <LoadingState variant="detail" /> });
const card = 'glass rounded-card border border-line-soft px-page-x py-page-y';
const heading = 'mb-inline font-display text-title font-semibold';
export function CaptainSettings({ signOut }: { signOut?: ReactNode }) {
  const t = useT(messages), legacy = useT(legacyMessages), demo = useDemoExpiry();
  const { now } = useCalendarClock(), timezone = useTimezone();
  const loader = useCallback(() => loadCaptainSettings(), []);
  const resource = useResource('settings:captain:workspace', loader);
  const [panel, setPanel] = useState<Panel | null>(null);
  const profile = resource.data;
  const setEdited = (next: SettingsProfile) => { void resource.mutate(() => next, async () => {}); };
  return <section className="space-y-card-gap">
    <PageBarTitle title={legacy('settings')} />
    {!profile ? resource.error ? <ErrorState message={legacy('couldnTLoadSettings')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />
      : <LoadingState variant="detail" /> : <>
      <div className="grid items-start gap-stack min-[760px]:grid-cols-2">
        <WorkspacePageCard profile={profile} edit={() => setPanel('profile')} />
        <WorkspacePreferences profile={profile} update={setEdited} />
      </div>
      <div className="grid items-start gap-card-gap min-[760px]:grid-cols-2">
        {now && ramadanSettingsVisible(localDate(now, timezone)) && <Ramadan />}
        <SubscriptionEntry />
        <PaymentMethods />
        <FoodPricesEntry />
        <PublicPage profile={profile} onSave={setEdited} />
        <section className={card}><h2 className={heading}>{t('invite')}</h2><p className="text-row leading-[1.9] text-muted">{profile.invite_message || t('unset')}</p>
          <Button variant="secondary" className="mt-stack min-h-12 rounded-full" onClick={() => setPanel('invite')}>{t('editInvite')}</Button></section>
        <section className={card}><h2 className={heading}>{t('account')}</h2><div>
          <WorkspaceFact label={t('profile')}><Button variant="secondary" className="min-h-12 rounded-full" onClick={() => setPanel('profile')}>{t('edit')}</Button></WorkspaceFact>
          <WorkspaceFact label={t('whatsapp')}><span dir="ltr">{profile.social?.whatsapp?.replace('https://wa.me/', '+') || profile.phone || t('unset')}</span></WorkspaceFact>
          <WorkspaceFact label={t('download')}><Button variant="secondary" className="min-h-12 rounded-full" onClick={() => setPanel('download')}>{t('downloadAction')}</Button></WorkspaceFact>
          <WorkspaceFact label={t('signOut')}>{signOut}</WorkspaceFact>
          {!demo && !demoExpiry(profile) && <WorkspaceFact label={t('delete')} danger><Button variant="secondary" className="min-h-12 rounded-full text-danger" onClick={() => setPanel('delete')}>{t('deleteAction')}</Button></WorkspaceFact>}
        </div><Button variant="secondary" className="mt-inline min-h-12 rounded-full text-muted" onClick={() => setPanel('more')}>{t('more')}</Button></section>
      </div>
      {panel && <WorkspaceSheet title={t(panel)} onClose={() => setPanel(null)}>
        {panel === 'profile' && <Profile profile={profile} onSave={setEdited} quiet />}
        {panel === 'invite' && <Invite initialMessage={profile.invite_message} onSave={setEdited} />}
        {panel === 'download' && <Export />}
        {panel === 'delete' && <Delete requestedAt={profile.deletion_requested_at} onChange={due => setEdited({ ...profile, deletion_requested_at: due && deletionRequestedAt(due) })} />}
        {panel === 'more' && <Options />}
      </WorkspaceSheet>}
    </>}
  </section>;
}

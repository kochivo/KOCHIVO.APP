'use client';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { demoExpiry, useDemoExpiry } from '@/features/demo';
import { SubscriptionEntry } from '@/features/billing';
import { messages as legacyMessages } from '../messages';
import { messages } from '../workspace/messages';
import { deletionRequestedAt } from '../deletion';
import { loadCaptainSettings } from '../data/workspace-settings';
import type { SettingsProfile } from '../schema';
import { WorkspaceFact } from './workspace-fact';
import { WorkspaceSheet } from './workspace-sheet';
import { WorkspacePreferences } from './workspace-preferences';

const Profile = dynamic(() => import('./captain-profile-card').then(m => m.CaptainProfileCard), { loading: () => <LoadingState variant="detail" /> });
const Invite = dynamic(() => import('./invite-message-form').then(m => m.InviteMessageForm));
const Export = dynamic(() => import('./export-card').then(m => m.ExportCard));
const Delete = dynamic(() => import('./delete-account-card').then(m => m.DeleteAccountCard));
const Options = dynamic(() => import('./workspace-options').then(m => m.WorkspaceOptions));
type Panel = 'profile' | 'invite' | 'download' | 'delete' | 'more';
const card = 'glass rounded-card border border-line-soft px-5 py-[18px]';
const heading = 'mb-2 font-display text-[19px] font-semibold';
export function CaptainSettings({ signOut }: { signOut?: ReactNode }) {
  const t = useT(messages), legacy = useT(legacyMessages), demo = useDemoExpiry();
  const loader = useCallback(() => loadCaptainSettings(), []);
  const resource = useResource('settings:captain:workspace', loader);
  const [panel, setPanel] = useState<Panel | null>(null);
  const profile = resource.data;
  const setEdited = (next: SettingsProfile) => { void resource.mutate(() => next, async () => {}); };
  return <section className="space-y-[18px]">
    <h1 id="settings-heading" tabIndex={-1} className="font-display text-[30px] font-semibold leading-tight">{legacy('settings')}</h1>
    {!profile ? resource.error ? <ErrorState message={legacy('couldnTLoadSettings')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />
      : <LoadingState variant="detail" /> : <>
      <div className="grid items-start gap-3.5 min-[1001px]:grid-cols-2">
        <section className={card}><h2 className={heading}>{t('profile')}</h2>
          <div><WorkspaceFact label={t('name')}>{profile.full_name}</WorkspaceFact>
            <WorkspaceFact label={t('page')}><span dir="ltr" className="break-all font-display">{profile.public_slug ? legacy('publicPreview', { slug: profile.public_slug }) : t('unset')}</span></WorkspaceFact>
            <WorkspaceFact label={t('whatsapp')}><span dir="ltr" className="font-display">{profile.social?.whatsapp?.replace('https://wa.me/', '+') || profile.phone || t('unset')}</span></WorkspaceFact></div>
          <Button variant="secondary" className="mt-3 min-h-12 rounded-full" onClick={() => setPanel('profile')}>{t('edit')}</Button>
        </section>
        <WorkspacePreferences profile={profile} update={setEdited} />
        <SubscriptionEntry />
        <section className={card}><h2 className={heading}>{t('invite')}</h2><p className="text-[13px] leading-[1.9] text-muted">{profile.invite_message || t('invitePreview')}</p>
          <Button variant="secondary" className="mt-3 min-h-12 rounded-full" onClick={() => setPanel('invite')}>{t('editInvite')}</Button></section>
        <section className={card}><h2 className={heading}>{t('account')}</h2><div>
          <WorkspaceFact label={t('download')}><Button variant="secondary" className="min-h-12 rounded-full" onClick={() => setPanel('download')}>{t('downloadAction')}</Button></WorkspaceFact>
          <WorkspaceFact label={t('signOut')}>{signOut}</WorkspaceFact>
          {!demo && !demoExpiry(profile) && <WorkspaceFact label={t('delete')} danger><Button variant="secondary" className="min-h-12 rounded-full text-danger" onClick={() => setPanel('delete')}>{t('deleteAction')}</Button></WorkspaceFact>}
        </div><Button variant="secondary" className="mt-2 min-h-12 rounded-full text-muted" onClick={() => setPanel('more')}>{t('more')}</Button></section>
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

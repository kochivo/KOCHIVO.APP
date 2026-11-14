import { getT } from '@/core/i18n/server';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { loadCaptainSlug } from '../data/captain-slug';
import { loadJoinRequests } from '../data/join-requests';
import { messages } from '../messages';
import { CopyLinkButton } from './copy-link-button-entry';
import { JoinRequestsList } from './join-requests-list-entry';

export async function WorkspaceJoinPage() {
  const [t, requests, link] = await Promise.all([getT(messages), loadJoinRequests(), loadCaptainSlug()]);
  const now = new Date().getTime();
  return <>
    <PageBarTitle title={t('pending')} />
    <PageBarActions><div className="hidden min-[760px]:block">
      {link.error ? <p role="alert">{t('linkLoadFailed')}</p> : link.slug
        ? <CopyLinkButton url={`https://kochivo.site/c/${link.slug}`} label={t('copyJoinLink')} />
        : <p className="text-sm text-muted">{t('choosePageLink')}</p>}
    </div></PageBarActions>
    {requests.error ? <p role="alert" className="text-danger">{requests.error}</p>
      : <JoinRequestsList rows={requests.data ?? []} workspace now={now} />}
  </>;
}

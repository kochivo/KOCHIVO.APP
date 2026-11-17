import { getT } from '@/core/i18n/server';
import { buttonClass } from '@/ui/button';
import { PageBarTitle } from '@/ui/page-bar-title';
import { loadCaptainSlug } from '../data/captain-slug';
import { loadJoinRequests } from '../data/join-requests';
import { messages } from '../messages';
import { CopyLinkButton } from './copy-link-button-entry';
import { JoinRequestsList } from './join-requests-list-entry';

export async function WorkspaceJoinPage() {
  const [t, requests, link] = await Promise.all([getT(messages), loadJoinRequests(), loadCaptainSlug()]);
  const now = new Date().getTime();
  const url = !link.error && link.slug ? `https://kochivo.site/c/${link.slug}` : null;
  return <>
    <PageBarTitle title={t('pending')} />
    <div className="grid items-start gap-card-gap min-[760px]:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
      {requests.error ? <p role="alert" className="glass rounded-card p-card text-danger">{requests.error}</p>
        : <JoinRequestsList rows={requests.data ?? []} workspace now={now} />}
      <aside className="cut-corner glass space-y-stack p-card">
        <h2 className="text-md font-bold">{t('inviteLink')}</h2>
        <p className="text-xs text-muted">{t('inviteDescription')}</p>
        {link.error ? <p role="alert" className="text-danger">{t('linkLoadFailed')}</p> : url ? <>
          <p dir="ltr" className="recessed break-all rounded-control p-stack text-start text-sm font-semibold">{url}</p>
          <div className="flex flex-wrap items-start gap-inline">
            <CopyLinkButton url={url} label={t('copyJoinLink')} />
            <a href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"
              className={buttonClass({ variant: 'secondary', block: false })}>{t('shareInvite')}</a>
          </div>
        </> : <p className="text-sm text-muted">{t('choosePageLink')}</p>}
      </aside>
    </div>
  </>;
}

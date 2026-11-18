import 'server-only';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { mcpOrigin } from '@/features/mcp/server';
import { buttonClass } from '@/ui/button';
import { messages } from '../messages';
import { connectAccount } from '../data/access';
import { consentPath, oauthRedirectUrl } from '../data/oauth-path';
import { ConsentActions } from './consent-actions';

export async function ConsentPage({ authorizationId }: { authorizationId?: string | string[] }) {
  if (!mcpOrigin()) notFound();
  const t = await getT(messages);
  const id = typeof authorizationId === 'string' && authorizationId.trim() ? authorizationId : null;
  const account = id ? await connectAccount().catch(() => undefined) : undefined;
  if (account === null && id) {
    redirect(`/login?${new URLSearchParams({ returnTo: consentPath(id) })}`);
  }
  const result = account && id
    ? await account.db.auth.oauth.getAuthorizationDetails(id).catch(() => null) : null;
  const details = result?.data;
  if (details && 'redirect_url' in details) {
    const url = oauthRedirectUrl(details.redirect_url);
    if (url) redirect(url);
  }

  return <main className="relative min-h-dvh bg-bg px-page-x py-page-y text-ink">
    <div className="mx-auto flex min-h-[calc(100dvh-2*var(--spacing-page-y))] w-full max-w-lg flex-col gap-card-gap">
      {!details || 'redirect_url' in details ? <div role="alert" className="glass space-y-stack rounded-card p-card">
        {id ? <>
          <p>{t('loadError')}</p>
          <a href={consentPath(id)} className={buttonClass({ variant: 'secondary' })}>{t('retry')}</a>
        </> : <>
          <h1 className="text-h font-extrabold">{t('incompleteLink')}</h1>
          <p>{t('restartConsent')}</p>
        </>}
      </div> : !account?.eligible ? <>
        <h1 className="pt-section text-h font-extrabold">{t('ineligible')}</h1>
        <ConsentActions id={details.authorization_id} eligible={false} />
      </> : (() => {
        const client = details.client.name?.trim() || t('unknownClient');
        const company = /claude/i.test(client) ? 'Anthropic' : /chatgpt/i.test(client) ? 'OpenAI' : t('company');
        const player = account.profile?.role === 'player';
        const name = account.profile?.full_name?.trim();
        return <>
          <header className="space-y-card-gap pt-section text-center">
            <div aria-hidden className="flex items-center justify-center gap-card-gap" dir="ltr">
              <span className="size-16 rounded-card bg-[url('/icons/icon-192.png')] bg-cover" />
              <ArrowLeftRight className="size-6 text-muted" />
              <span className="glass-strong grid size-16 place-items-center rounded-card text-h font-extrabold">{Array.from(client)[0]}</span>
            </div>
            <h1 className="wrap-anywhere text-h font-extrabold">{t('consentTitle', { client })}</h1>
            {name && <p className="text-sm text-muted">{t('signedInAs', { name })}</p>}
          </header>
          <section className="glass space-y-stack rounded-card p-card">
            <h2 className="font-semibold">{t('can')}</h2>
            <ul className="space-y-stack">
              {(player ? ['playerRead', 'playerLog'] as const : ['canRead'] as const).map(key =>
                <li key={key} className="flex items-start gap-stack text-sm"><Check aria-hidden className="size-5 shrink-0 text-lime" />{t(key)}</li>)}
            </ul>
            {player && <p className="text-sm text-muted">{t('playerPhotos')}</p>}
            <h2 className="font-semibold">{t('cannot')}</h2>
            <ul className="space-y-stack">
              {(player ? ['playerCannotEdit', 'playerCannotSee'] as const : ['cannotChange'] as const).map(key =>
                <li key={key} className="flex items-start gap-stack text-sm text-muted"><X aria-hidden className="size-5 shrink-0" />{t(key)}</li>)}
            </ul>
          </section>
          <p className="text-sm text-muted">{t('sharing', { company, client })}</p>
          <ConsentActions id={details.authorization_id} eligible />
        </>;
      })()}
    </div>
  </main>;
}

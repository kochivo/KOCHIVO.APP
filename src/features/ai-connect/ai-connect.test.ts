import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ConsentPage } from './components/consent-page';
import { decideConsent, loadConnectedTools, revokeConnectedTool } from './data/actions';
import { GrantList } from './components/grant-list';
import { ConnectionDialog } from './components/connection-dialog';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

const mocks = vi.hoisted(() => ({
  claims: vi.fn(), profile: vi.fn(), details: vi.fn(), deny: vi.fn(), approve: vi.fn(), grants: vi.fn(),
  revoke: vi.fn(), since: vi.fn(), like: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/features/mcp/server', async () => import('../mcp/config'));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(url); },
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));
vi.mock('@/core/i18n/client', () => ({
  useLocale: () => 'en', useT: () => createT(messages, 'en'),
}));
vi.mock('@/core/supabase/server', () => ({
  supabaseServer: async () => ({
    auth: { getClaims: mocks.claims, oauth: {
      getAuthorizationDetails: mocks.details, denyAuthorization: mocks.deny, approveAuthorization: mocks.approve,
      listGrants: mocks.grants, revokeGrant: mocks.revoke,
    } },
    from: (table: string) => ({
      select: () => table === 'profiles'
        ? { eq: () => ({ maybeSingle: mocks.profile }) }
        : { eq: () => ({ like: mocks.like }) },
    }),
  }),
}));

const client = { id: 'connector', name: 'Claude', uri: '', logo_uri: '' };
const grant = { client, granted_at: '2026-11-13T00:00:00Z', scopes: ['openid'] };
const id = 'authorization-id';
const grantActions = { onConnect: vi.fn(), onDisconnect: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('MCP_ENABLED', '1');
  vi.stubEnv('KO_ORIGIN', 'https://kochivo.site');
  vi.stubEnv('MCP_PILOT_USER_IDS', 'pilot');
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'pilot' } } });
  mocks.profile.mockResolvedValue({ data: { role: 'captain', role_confirmed: true, suspended_at: null, full_name: 'Sam', timezone: 'Africa/Cairo' } });
  mocks.details.mockResolvedValue({ data: { authorization_id: id, client, user: { email: 'private@example.com' } } });
  mocks.deny.mockResolvedValue({ data: { redirect_url: 'https://claude.ai/denied' } });
  mocks.approve.mockResolvedValue({ data: { redirect_url: 'https://claude.ai/approved' } });
  mocks.grants.mockResolvedValue({ data: [grant] });
  mocks.revoke.mockResolvedValue({ data: {} });
  mocks.like.mockReturnValue({ gte: mocks.since });
  mocks.since.mockResolvedValue({ count: 3 });
});
afterEach(() => vi.unstubAllEnvs());

it('offers an unconfirmed player only the denial action and rejects direct approval', async () => {
  mocks.profile.mockResolvedValue({ data: { role: 'player', suspended_at: null } });
  const html = renderToStaticMarkup(await ConsentPage({ authorizationId: id }));
  expect(html).toContain('This account cannot connect tools');
  expect(html).toContain('>Deny and return<');
  expect(html).not.toContain('>Allow<');
  expect(await decideConsent(id, 'approve')).toBe(false);
  expect(mocks.approve).not.toHaveBeenCalled();
  await expect(decideConsent(id, 'deny')).rejects.toThrow('https://claude.ai/denied');
  expect(mocks.deny).toHaveBeenCalledWith(id, { skipBrowserRedirect: true });
});

it('explains player access and lets a confirmed player approve', async () => {
  mocks.profile.mockResolvedValue({ data: { role: 'player', role_confirmed: true, suspended_at: null } });
  const html = renderToStaticMarkup(await ConsentPage({ authorizationId: id }));
  expect(html).toContain('Mark meals in your plan as eaten when you ask');
  expect(html).toContain('What it cannot do');
  expect(html).toContain('Food photos');
  expect(html).toContain('>Allow<');
  await expect(decideConsent(id, 'approve')).rejects.toThrow('https://claude.ai/approved');
});

it('shows the client, company and captain name without the email', async () => {
  const html = renderToStaticMarkup(await ConsentPage({ authorizationId: id }));
  expect(html).toContain('Claude wants to connect');
  expect(html).toContain('Anthropic');
  expect(html).toContain('Signed in as Sam');
  expect(html).toContain('What it cannot do');
  expect(html).not.toContain('Mark meals in your plan as eaten');
  expect(html).not.toContain('private@example.com');
  await expect(decideConsent(id, 'approve')).rejects.toThrow('https://claude.ai/approved');
});

it('follows an already-consented authorization redirect', async () => {
  mocks.details.mockResolvedValue({ data: { redirect_url: 'https://claude.ai/callback' } });
  await expect(ConsentPage({ authorizationId: id })).rejects.toThrow('https://claude.ai/callback');
});

it('sends a signed-out visitor to login with their consent URL', async () => {
  mocks.claims.mockResolvedValue({ data: null });
  await expect(ConsentPage({ authorizationId: id })).rejects.toThrow(
    '/login?returnTo=%2Foauth%2Fconsent%3Fauthorization_id%3Dauthorization-id');
  expect(mocks.details).not.toHaveBeenCalled();
});

it('loads grants and counts MCP calls from the start of the captain’s week', async () => {
  expect(await loadConnectedTools(new Date('2026-11-18T12:00:00Z'))).toEqual({ grants: [grant], count: 3 });
  expect(mocks.like).toHaveBeenCalledWith('client', 'mcp:%');
  expect(mocks.since).toHaveBeenCalledWith('created_at', '2026-11-13T22:00:00.000Z');
});

it('renders the grant name, date and disconnect action', () => {
  const html = renderToStaticMarkup(createElement(GrantList, { grants: [grant], ...grantActions }));
  expect(html).toContain('Claude');
  expect(html).toContain('13 Nov 2026');
  expect(html).toContain('>Disconnect<');
  expect(html).not.toContain('Connect Claude');
});

it('shows both setup choices without connected grants', () => {
  const html = renderToStaticMarkup(createElement(GrantList, { grants: [], ...grantActions }));
  expect(html).toMatch(/Connect Claude.*Connect ChatGPT/);
  expect(html.match(/Not connected/g)).toHaveLength(2);
  expect(html).not.toContain('Disconnect');
});

const dialogProps = {
  url: 'https://kochivo.site/api/mcp', fallback: vi.fn(), onClose: vi.fn(), onConfirm: vi.fn(),
  pending: false, failed: false,
};
const opener = {} as HTMLButtonElement;

it.each([['Claude', 'Add custom connector'], ['ChatGPT', 'Developer mode']] as const)(
  'shows only the selected setup steps for %s', (name, instructions) => {
    const html = renderToStaticMarkup(createElement(ConnectionDialog, {
      ...dialogProps, step: { kind: 'connect', name, opener },
    }));
    expect(html).toMatch(/<h2[^>]+tabindex="-1"[^>]*>/i);
    expect(html).toContain(instructions);
    expect(html).toContain(dialogProps.url);
    expect(html).toContain('>Copy<');
    expect(html).not.toContain(name === 'Claude' ? 'Developer mode' : 'Add custom connector');
  });

it('offers a scoped disconnect retry and a way to keep the grant', () => {
  const html = renderToStaticMarkup(createElement(ConnectionDialog, {
    ...dialogProps, failed: true, step: { kind: 'disconnect', name: client.name, id: client.id, opener },
  }));
  expect(html).toContain('role="alertdialog"');
  expect(html).toContain('Claude will lose access to your account right away');
  expect(html).toContain('Could not disconnect the tool. Try again.');
  expect(html).toContain('>Keep connected<');
  expect(html).toContain('>Disconnect<');
  expect(dialogProps.onConfirm).not.toHaveBeenCalled();
});

it.each([undefined, '', '  ', [id, id]])('explains how to restart an incomplete consent link (%s)', async authorizationId => {
  const html = renderToStaticMarkup(await ConsentPage({ authorizationId }));
  expect(html).toContain('<h1');
  expect(html).toContain('Start again from Claude or ChatGPT');
  expect(html).not.toContain('Try again');
  expect(mocks.details).not.toHaveBeenCalled();
});

it('retries the requested authorization only when the link contains a single ID', async () => {
  mocks.details.mockResolvedValue({ error: new Error('Unavailable') });
  const html = renderToStaticMarkup(await ConsentPage({ authorizationId: id }));
  expect(html).toContain('href="/oauth/consent?authorization_id=authorization-id"');
});

it('revokes a grant for the signed-in pilot', async () => {
  expect(await revokeConnectedTool(client.id)).toBe(true);
  expect(mocks.revoke).toHaveBeenCalledWith({ clientId: client.id });
});

it('blocks revocation when the pilot flag is off', async () => {
  vi.stubEnv('MCP_ENABLED', '0');
  expect(await revokeConnectedTool(client.id)).toBe(false);
  expect(mocks.revoke).not.toHaveBeenCalled();
});

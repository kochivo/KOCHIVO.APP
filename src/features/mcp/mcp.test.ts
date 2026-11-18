import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DELETE, GET, OPTIONS, POST } from '@/app/api/mcp/route';
import { GET as metadata, OPTIONS as metadataOptions } from '@/app/.well-known/oauth-protected-resource/route';
import type * as AiTools from '@/features/ai-tools/server';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), claims: vi.fn(), user: vi.fn(), profile: vi.fn(), list: vi.fn(), run: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }));
vi.mock('@/core/config/env', () => ({ publicEnv: () => ({
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
}) }));
vi.mock('@/features/ai-tools/server', () => ({ listTools: mocks.list, runTool: mocks.run }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('MCP_ENABLED', '1');
  vi.stubEnv('KO_ORIGIN', 'https://kochivo.site');
  vi.stubEnv('MCP_PILOT_USER_IDS', ' other, captain-id ');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'captain-id', client_id: 'client/one' } }, error: null });
  mocks.user.mockResolvedValue({ data: { user: { id: 'captain-id' } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: 'captain', suspended_at: null, timezone: 'Africa/Cairo' } });
  mocks.create.mockReturnValue({
    auth: { getClaims: mocks.claims, getUser: mocks.user },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    rpc: mocks.rpc,
  });
});
afterEach(() => vi.unstubAllEnvs());

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(new Request('https://kochivo.site/api/mcp', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', authorization: 'Bearer token', ...headers },
  }));
}
const rpc = (method: string, params?: unknown) => ({ jsonrpc: '2.0', id: 7, method, params });

it.each(['2025-03-26', '2025-06-18', 'unknown'])('negotiates %s on initialize', async version => {
  const response = await post(rpc('initialize', { protocolVersion: version }));
  expect(await response.json()).toMatchObject({ id: 7, result: {
    protocolVersion: version === 'unknown' ? '2025-06-18' : version,
    capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'kochivo', version: '1.0.0' },
  } });
  expect(response.headers.get('cache-control')).toBe('no-store');
});

it('accepts notifications with no response body', async () => {
  const response = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  expect(response.status).toBe(202);
  expect(await response.text()).toBe('');
});

it('advertises the registry tools with read-only annotations', async () => {
  const inputSchema = { type: 'object' };
  mocks.list.mockReturnValue([{ name: 'list_athletes', description: 'Lists athletes', inputJsonSchema: inputSchema }]);
  expect((await (await post(rpc('tools/list'))).json()).result.tools).toEqual([
    { name: 'list_athletes', description: 'Lists athletes', inputSchema, annotations: { readOnlyHint: true, openWorldHint: false } },
  ]);
});

it('returns both representations of the tool result using the bearer-scoped client', async () => {
  const data = { athletes: [] };
  mocks.run.mockResolvedValue({ ok: true, data });
  const response = await post(rpc('tools/call', { name: 'list_athletes', arguments: {} }));
  expect((await response.json()).result).toEqual({
    content: [{ type: 'text', text: '{"athletes":[]}' }], structuredContent: data, isError: false,
  });
  expect(mocks.create).toHaveBeenCalledWith('https://project.supabase.co', 'publishable',
    expect.objectContaining({ global: { headers: { Authorization: 'Bearer token' } } }));
  expect(mocks.claims).toHaveBeenCalledWith('token');
  expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({
    actor: { id: 'captain-id', role: 'captain', db: mocks.create.mock.results[0]?.value },
    client: 'mcp:clientone', timezone: 'Africa/Cairo', signal: expect.any(AbortSignal),
  }), 'list_athletes', {});
});

it('returns tool failures in the tool result', async () => {
  mocks.run.mockResolvedValue({ ok: false, error: { code: 'not_found', message: 'Missing' } });
  expect((await (await post(rpc('tools/call', { name: 'list_athletes' }))).json()).result).toEqual({
    content: [{ type: 'text', text: 'not_found: Missing' }], isError: true,
  });
});

it('does not expose athlete details outside the authenticated captain’s roster', async () => {
  const { runTool } = await vi.importActual<typeof AiTools>('@/features/ai-tools/server');
  mocks.run.mockImplementation(runTool);
  mocks.rpc.mockImplementation((name: string) => name === 'captain_roster'
    ? { abortSignal: async () => ({ data: [{ player_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' }], error: null }) }
    : Promise.resolve({ data: true, error: null }));
  const response = await post(rpc('tools/call', {
    name: 'get_athlete_details', arguments: { athleteId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' },
  }));
  expect((await response.json()).result).toMatchObject({
    content: [{ type: 'text', text: expect.stringMatching(/^not_found:/) }], isError: true,
  });
});

it.each(['missing', 'invalid', 'app session', 'revoked'])('challenges a %s token', async kind => {
  if (kind === 'invalid') mocks.claims.mockResolvedValue({ data: null, error: new Error() });
  if (kind === 'app session') mocks.claims.mockResolvedValue({ data: { claims: { sub: 'captain-id' } } });
  if (kind === 'revoked') mocks.user.mockResolvedValue({ data: { user: null }, error: new Error() });
  const response = await post(rpc('ping'), kind === 'missing' ? { authorization: '' } : {});
  expect(response.status).toBe(401);
  expect(response.headers.get('www-authenticate')).toBe(
    'Bearer resource_metadata="https://kochivo.site/.well-known/oauth-protected-resource"');
});

it.each(['player', 'non-pilot', 'suspended', 'bad origin'])('rejects %s with 403', async kind => {
  if (kind === 'non-pilot') vi.stubEnv('MCP_PILOT_USER_IDS', 'other');
  if (kind === 'player') mocks.profile.mockResolvedValue({ data: { role: 'player', suspended_at: null } });
  if (kind === 'suspended') mocks.profile.mockResolvedValue({ data: { role: 'captain', suspended_at: '2026-11-01' } });
  const response = await post(rpc('ping'), kind === 'bad origin' ? { origin: 'https://other.site' } : {});
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ jsonrpc: '2.0', error: { code: expect.any(Number) } });
});

it.each([GET, DELETE])('rejects unsupported transports', handler => {
  const response = handler();
  expect(response.status).toBe(405);
  expect(response.headers.get('allow')).toBe('POST');
});

it('allows a browser preflight from an approved origin', () => {
  const response = OPTIONS(new Request('https://kochivo.site/api/mcp', { headers: { origin: 'https://claude.ai' } }));
  expect(response.status).toBe(204);
  expect(response.headers.get('access-control-allow-origin')).toBe('https://claude.ai');
  expect(response.headers.get('access-control-allow-headers')).toBe('authorization, content-type, mcp-protocol-version, mcp-session-id');
});

it.each([[rpc('missing'), -32601], [rpc('tools/call', {}), -32602], [[rpc('ping')], -32600]])(
  'rejects an invalid RPC request with the matching code', async (body, code) => {
    expect((await (await post(body)).json()).error.code).toBe(code);
  },
);

it('caps the body by UTF-8 bytes without a content-length header', async () => {
  expect((await post(rpc('ping', { text: 'ش'.repeat(32768) }))).status).toBe(413);
});

it('hides the POST and metadata endpoints when disabled', async () => {
  vi.stubEnv('MCP_ENABLED', '0');
  expect((await post(rpc('ping'))).status).toBe(404);
  expect(metadata().status).toBe(404);
  expect(metadataOptions().status).toBe(404);
});

it('serves public OAuth discovery metadata', async () => {
  const response = metadata();
  expect(await response.json()).toEqual({
    resource: 'https://kochivo.site/api/mcp',
    authorization_servers: ['https://project.supabase.co/auth/v1'],
    scopes_supported: ['openid', 'email', 'profile'], bearer_methods_supported: ['header'], resource_name: 'KOCHIVO',
  });
  expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
  expect(response.headers.get('access-control-allow-origin')).toBe('*');
  expect(metadataOptions().headers.get('access-control-allow-origin')).toBe('*');
});

import 'server-only';
import { mcpOrigin } from './config';

export const metadataPath = '/.well-known/oauth-protected-resource';
const cors = { 'Access-Control-Allow-Origin': '*' };

export function getMetadata() {
  const origin = mcpOrigin();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  if (!origin || !supabaseUrl) return new Response(null, { status: 404 });
  return Response.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [`${supabaseUrl}/auth/v1`],
    scopes_supported: ['openid', 'email', 'profile'],
    bearer_methods_supported: ['header'],
    resource_name: 'KOCHIVO',
  }, { headers: { ...cors, 'Cache-Control': 'public, max-age=3600' } });
}

export function optionsMetadata() {
  if (!mcpOrigin() || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) return new Response(null, { status: 404 });
  return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}
